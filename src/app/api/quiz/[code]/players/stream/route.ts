import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime  = "nodejs";

function anonymise(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A player";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

type StreamPayload = {
  playerCount: number;
  status:      string;
  winners?:    { name: string; rank: number }[];
};

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } },
) {
  const { code } = params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let lastCount  = -1;
      let lastStatus = "";
      let winnersEmitted = false;

      function send(payload: StreamPayload) {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
          );
        } catch {
          closed = true;
        }
      }

      async function tick() {
        if (closed) return;
        try {
          const collection = await prisma.distributorCollection.findUnique({
            where:   { publicLinkCode: code },
            include: {
              quizSessions: {
                where:   { status: { in: ["PENDING", "ACTIVE", "ENDED"] } },
                orderBy: { createdAt: "desc" },
                take:    1,
                include: {
                  _count:  { select: { entries: true } },
                  entries: {
                    orderBy: { totalScore: "desc" },
                    take:    3,
                    include: { user: { select: { name: true } } },
                  },
                },
              },
            },
          });

          const session     = collection?.quizSessions[0];
          const playerCount = session?._count.entries ?? 0;
          const status      = session?.status ?? "PENDING";

          const countChanged  = playerCount !== lastCount;
          const statusChanged = status      !== lastStatus;

          if (countChanged || statusChanged) {
            lastCount  = playerCount;
            lastStatus = status;

            const payload: StreamPayload = { playerCount, status };

            if (status === "ENDED" && !winnersEmitted && session?.entries.length) {
              winnersEmitted = true;
              payload.winners = session.entries.map((e, i) => ({
                name: anonymise(e.user?.name ?? "Player"),
                rank: i + 1,
              }));
            }

            send(payload);
          }
        } catch {
          // DB errors are transient — keep streaming
        }
      }

      // Initial tick immediately
      await tick();

      const interval = setInterval(() => void tick(), 2000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
