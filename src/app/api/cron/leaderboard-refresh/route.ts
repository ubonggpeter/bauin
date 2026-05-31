/**
 * POST /api/cron/leaderboard-refresh
 * Refreshes the weekly leaderboard cache from DB.
 * Schedule hourly: Authorization: Bearer <CRON_SECRET>
 */
import { NextResponse } from "next/server";
import { refreshLeaderboard } from "@/lib/server/leaderboard";
import { runWithRetries, isCronAuthorized } from "@/lib/server/cron-runner";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const start         = Date.now();
    const { attempts }  = await runWithRetries("leaderboard-refresh", () => refreshLeaderboard());
    return NextResponse.json({ ok: true, ms: Date.now() - start, attempts });
  } catch {
    return NextResponse.json({ error: "Job failed after 3 retries" }, { status: 500 });
  }
}
