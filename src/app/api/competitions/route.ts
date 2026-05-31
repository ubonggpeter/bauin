/**
 * GET /api/competitions
 * Returns weekly leaderboard, user rank, prizes, and countdown.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLeaderboard, getUserLeaderboardRank, weekEnd, secondsUntilReset } from "@/lib/server/leaderboard";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const [leaderboard, userRank, prizePoolSetting, pastWinner] = await Promise.all([
    getLeaderboard(10),
    getUserLeaderboardRank(userId),
    prisma.platformSettings.findUnique({ where: { key: "WEEKLY_PRIZE_POOL" } }),
    prisma.weeklyCompetition.findFirst({
      where:   { status: "CLOSED" },
      orderBy: { closedAt: "desc" },
    }),
  ]);

  const prizePool = Number(prizePoolSetting?.value ?? 30000);
  const prizes    = [
    { rank: 1, label: "1st Place", amount: Math.round(prizePool * 0.60), color: "#F0B429" },
    { rank: 2, label: "2nd Place", amount: Math.round(prizePool * 0.25), color: "#9CA3AF" },
    { rank: 3, label: "3rd Place", amount: Math.round(prizePool * 0.15), color: "#CD7F32" },
  ];

  return NextResponse.json({
    leaderboard,
    userRank,
    prizes,
    prizePool,
    resetAt:         weekEnd().toISOString(),
    secondsUntilReset: secondsUntilReset(),
    lastWeekWinners: pastWinner?.winners ?? null,
  });
}
