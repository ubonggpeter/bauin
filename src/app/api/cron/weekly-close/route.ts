/**
 * POST /api/cron/weekly-close
 * Closes the weekly competition: pays top 3, resets leaderboard.
 * Schedule Sunday 23:59 UTC: Authorization: Bearer <CRON_SECRET>
 */
import { NextResponse } from "next/server";
import { closeWeeklyCompetition } from "@/lib/server/leaderboard";
import { runWithRetries, isCronAuthorized } from "@/lib/server/cron-runner";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { attempts } = await runWithRetries("weekly-close", () => closeWeeklyCompetition());
    return NextResponse.json({ ok: true, attempts, message: "Weekly competition closed and prizes distributed." });
  } catch {
    return NextResponse.json({ error: "Job failed after 3 retries" }, { status: 500 });
  }
}
