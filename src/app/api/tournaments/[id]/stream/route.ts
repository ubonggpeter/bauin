import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const tournamentId = params.id;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      async function push() {
        try {
          const tournament = await prisma.tournament.findUnique({
            where:  { id: tournamentId },
            select: { quizSessionId: true, status: true },
          });

          if (!tournament) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "not_found" })}\n\n`));
            controller.close();
            return;
          }

          const leaderboard = await prisma.quizEntry.findMany({
            where:   { quizSessionId: tournament.quizSessionId },
            orderBy: { totalScore: "desc" },
            take:    50,
            select:  {
              id:         true,
              userId:     true,
              totalScore: true,
              user:       { select: { name: true } },
            },
          });

          const payload = leaderboard.map((e, i) => ({
            rank:       i + 1,
            userId:     e.userId,
            name:       e.user.name ?? "Anonymous",
            totalScore: e.totalScore,
          }));

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ leaderboard: payload, status: tournament.status })}\n\n`));

          if (tournament.status === "ENDED") {
            controller.close();
            return;
          }
        } catch {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "internal" })}\n\n`));
        }
      }

      await push();
      const interval = setInterval(push, 5000);

      // Clean up when client disconnects
      _req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
    },
  });
}
