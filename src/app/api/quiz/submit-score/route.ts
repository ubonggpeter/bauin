/**
 * POST /api/quiz/submit-score
 *
 * Calculates totalScore, updates rank, writes leaderboard to Redis,
 * and publishes a score-update event to the quiz channel.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getCachedLeaderboard, setCachedLeaderboard,
  invalidateCachedLeaderboard, publishScoreUpdate,
} from "@/lib/server/quiz-cache";

export const dynamic = "force-dynamic";

type ScoreBody = {
  entryId:     string;
  phase1Score: number;
  phase2Score: number;
  phase3Score: number;
  phase4Score: number;
  phase5Score: number;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: ScoreBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { entryId, phase1Score, phase2Score, phase3Score, phase4Score, phase5Score } = body;

  const entry = await prisma.quizEntry.findUnique({
    where:   { id: entryId },
    include: { user: { select: { name: true } } },
  });
  if (!entry || entry.userId !== userId) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const totalScore = [phase1Score, phase2Score, phase3Score, phase4Score, phase5Score]
    .reduce((a, b) => a + b, 0);

  await prisma.quizEntry.update({
    where: { id: entryId },
    data: {
      phase1Score, phase2Score, phase3Score, phase4Score, phase5Score,
      totalScore,
      completedAt: new Date(),
    },
  });

  // ── Rank calculation ──────────────────────────────────────────
  const betterCount = await prisma.quizEntry.count({
    where: {
      quizSessionId: entry.quizSessionId,
      totalScore:    { gt: totalScore },
      completedAt:   { not: null },
    },
  });
  const rank = betterCount + 1;
  await prisma.quizEntry.update({ where: { id: entryId }, data: { rank } });

  const totalPlayers = await prisma.quizEntry.count({
    where: { quizSessionId: entry.quizSessionId },
  });

  // ── Rebuild + cache leaderboard ───────────────────────────────
  const allCompleted = await prisma.quizEntry.findMany({
    where:   { quizSessionId: entry.quizSessionId, completedAt: { not: null } },
    include: { user: { select: { name: true } } },
    orderBy: { totalScore: "desc" },
  });

  const leaderboard = allCompleted.map((e, i) => ({
    entryId:     e.id,
    userId:      e.userId,
    name:        e.user?.name ?? `Player ${e.id.slice(-4)}`,
    totalScore:  e.totalScore,
    rank:        i + 1,
    completedAt: e.completedAt?.toISOString() ?? null,
  }));

  await invalidateCachedLeaderboard(entry.quizSessionId);
  await setCachedLeaderboard(entry.quizSessionId, leaderboard);

  // ── Broadcast to /quiz socket channel ────────────────────────
  await publishScoreUpdate(entry.quizSessionId, {
    entryId,
    userId,
    name:       entry.user?.name ?? `Player ${entryId.slice(-4)}`,
    totalScore,
    rank,
  });

  return NextResponse.json({
    totalScore, rank, totalPlayers,
    phase1Score, phase2Score, phase3Score, phase4Score, phase5Score,
  });
}
