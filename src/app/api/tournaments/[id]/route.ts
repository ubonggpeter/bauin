import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const tournament = await prisma.tournament.findUnique({
    where:  { id: params.id },
    select: {
      id:             true,
      name:           true,
      description:    true,
      entryFee:       true,
      prizePool:      true,
      quizSessionId:  true,
      date:           true,
      status:         true,
      createdAt:      true,
      _count:         { select: { entries: true, bets: true } },
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
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

  return NextResponse.json({ tournament, leaderboard });
}
