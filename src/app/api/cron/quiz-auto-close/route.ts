/**
 * POST /api/cron/quiz-auto-close
 * Daily: close ACTIVE quiz sessions idle for longer than QUIZ_AUTO_CLOSE_HOURS (default 6h)
 * and PENDING sessions older than QUIZ_AUTO_CLOSE_PENDING_HOURS (default 48h).
 * Authorization: Bearer <CRON_SECRET>
 *
 * Delegates to /api/quiz/close/[sessionId] which handles revenue distribution,
 * bet settlement, and push notifications. The CRON_SECRET header bypasses the
 * session-owner auth check in that route.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAllSettings } from "@/lib/server/platform-settings";
import { runWithRetries, isCronAuthorized } from "@/lib/server/cron-runner";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { result, attempts } = await runWithRetries("quiz-auto-close", async () => {
      const settings         = await getAllSettings();
      const activeHours      = Math.max(1, Number(settings["QUIZ_AUTO_CLOSE_HOURS"]         ?? "6"));
      const pendingHours     = Math.max(1, Number(settings["QUIZ_AUTO_CLOSE_PENDING_HOURS"] ?? "48"));

      const now               = new Date();
      const activeCutoff      = new Date(now.getTime() - activeHours  * 3600_000);
      const pendingCutoff     = new Date(now.getTime() - pendingHours * 3600_000);

      const staleSessions = await prisma.quizSession.findMany({
        where: {
          OR: [
            { status: "ACTIVE",  startedAt: { lt: activeCutoff  } },
            { status: "PENDING", createdAt: { lt: pendingCutoff } },
          ],
        },
        select: { id: true, status: true },
      });

      const results: { id: string; closed: boolean; error?: string }[] = [];

      for (const session of staleSessions) {
        try {
          const res = await fetch(`${APP_URL}/api/quiz/close/${session.id}`, {
            method:  "POST",
            headers: {
              "Content-Type":  "application/json",
              Authorization:   `Bearer ${process.env.CRON_SECRET ?? ""}`,
            },
          });
          results.push({ id: session.id, closed: res.ok });
        } catch (err) {
          results.push({ id: session.id, closed: false, error: String(err) });
        }
      }

      return {
        found:   staleSessions.length,
        closed:  results.filter((r) => r.closed).length,
        failed:  results.filter((r) => !r.closed).length,
        results,
      };
    });

    return NextResponse.json({ ...result, attempts });
  } catch {
    return NextResponse.json({ error: "Job failed after 3 retries" }, { status: 500 });
  }
}
