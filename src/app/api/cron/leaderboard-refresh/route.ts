/**
 * POST /api/cron/leaderboard-refresh
 * Refreshes the weekly leaderboard cache from DB.
 * Schedule hourly: Authorization: Bearer <CRON_SECRET>
 */
import { NextResponse } from "next/server";
import { refreshLeaderboard } from "@/lib/server/leaderboard";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev mode: allow all
  return req.headers.get("Authorization") === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  await refreshLeaderboard();

  return NextResponse.json({ ok: true, ms: Date.now() - start });
}
