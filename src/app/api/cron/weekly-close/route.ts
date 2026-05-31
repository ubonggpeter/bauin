/**
 * POST /api/cron/weekly-close
 * Closes the weekly competition: pays top 3, resets leaderboard.
 * Schedule Sunday 23:59 UTC: Authorization: Bearer <CRON_SECRET>
 */
import { NextResponse } from "next/server";
import { closeWeeklyCompetition } from "@/lib/server/leaderboard";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("Authorization") === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await closeWeeklyCompetition();
  return NextResponse.json({ ok: true, message: "Weekly competition closed and prizes distributed." });
}
