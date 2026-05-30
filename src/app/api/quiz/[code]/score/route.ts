import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type ScoreBody = {
  entryId:     string;
  phase1Score: number;
  phase2Score: number;
  phase3Score: number;
  phase4Score: number;
  phase5Score: number;
};

export async function POST(
  req: Request,
  { params }: { params: { code: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: ScoreBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { entryId, phase1Score, phase2Score, phase3Score, phase4Score, phase5Score } = body;

  const entry = await prisma.quizEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.userId !== userId) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const totalScore = phase1Score + phase2Score + phase3Score + phase4Score + phase5Score;

  const updated = await prisma.quizEntry.update({
    where: { id: entryId },
    data: {
      phase1Score,
      phase2Score,
      phase3Score,
      phase4Score,
      phase5Score,
      totalScore,
      completedAt: new Date(),
    },
  });

  // Compute rank among all completed entries in this session
  const betterEntries = await prisma.quizEntry.count({
    where: {
      quizSessionId: entry.quizSessionId,
      totalScore:    { gt: totalScore },
      completedAt:   { not: null },
    },
  });
  const rank = betterEntries + 1;
  await prisma.quizEntry.update({ where: { id: entryId }, data: { rank } });

  const totalPlayers = await prisma.quizEntry.count({
    where: { quizSessionId: entry.quizSessionId },
  });

  void updated;
  return NextResponse.json({ totalScore, rank, totalPlayers, phase1Score, phase2Score, phase3Score, phase4Score, phase5Score });
}
