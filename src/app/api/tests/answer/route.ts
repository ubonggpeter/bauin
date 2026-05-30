import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: {
    attemptId: string;
    questionId: string;
    displayAnswer: string;
    timeTakenMs?: number;
    answeredAt?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { attemptId, questionId, displayAnswer, timeTakenMs, answeredAt } = body;
  if (!attemptId || !questionId || !displayAnswer) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const attempt = await prisma.testAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== userId) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Attempt is not in progress" }, { status: 400 });
  }

  const questionData = attempt.questionData as Array<{ qid: string; map: Record<string, string> }>;
  const entry = questionData.find((qe) => qe.qid === questionId);
  const mappedAnswer = entry?.map[displayAnswer] ?? displayAnswer;

  const flaggedFast = typeof timeTakenMs === "number" && timeTakenMs < 800;
  const ts = answeredAt ? new Date(answeredAt) : new Date();

  await prisma.testAnswer.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    create: { attemptId, questionId, displayAnswer, mappedAnswer, answeredAt: ts, timeTakenMs, flaggedFast },
    update: { displayAnswer, mappedAnswer, answeredAt: ts, timeTakenMs, flaggedFast },
  });

  return NextResponse.json({ ok: true, mappedAnswer, flaggedFast });
}
