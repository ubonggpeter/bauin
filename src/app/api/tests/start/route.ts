import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCategoryConfig } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

type QuestionEntry = {
  qid: string;
  map: Record<string, string>; // displayOption → originalOption
};

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getOptionText(q: Record<string, unknown>, original: string): string {
  return (q[`option${original}`] ?? "") as string;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: { categoryId: string; isRetry?: boolean; retryFeePaid?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { categoryId, isRetry = false, retryFeePaid = false } = body;
  if (!categoryId) {
    return NextResponse.json({ error: "categoryId required" }, { status: 400 });
  }

  const config = await getCategoryConfig(categoryId);
  if (!config) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  // Resume existing IN_PROGRESS attempt if present
  const existing = await prisma.testAttempt.findFirst({
    where: { userId, categoryId, status: "IN_PROGRESS" },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    const questionData = existing.questionData as QuestionEntry[];
    const qids = questionData.map((qe) => qe.qid);
    const dbQuestions = await prisma.testQuestion.findMany({ where: { id: { in: qids } } });
    const qMap = new Map(dbQuestions.map((q) => [q.id, q]));

    const safeQuestions = questionData.map((qe) => {
      const q = qMap.get(qe.qid);
      if (!q) return null;
      const options: Record<string, string> = {};
      for (const [display, original] of Object.entries(qe.map)) {
        options[display] = getOptionText(q as unknown as Record<string, unknown>, original);
      }
      return { id: qe.qid, questionText: q.questionText, options };
    }).filter(Boolean);

    return NextResponse.json({
      attemptId: existing.id,
      questions: safeQuestions,
      config: { passPercentage: config.passPercentage, questionCount: config.questionCount },
    });
  }

  // Fetch all active questions for category
  const allQuestions = await prisma.testQuestion.findMany({
    where: { categoryId, isActive: true },
  });
  if (allQuestions.length === 0) {
    return NextResponse.json({ error: "No questions available" }, { status: 422 });
  }

  const questionCount = Math.min(config.questionCount, allQuestions.length);
  const selected = shuffle(allQuestions).slice(0, questionCount);

  const questionData: QuestionEntry[] = [];
  const safeQuestions = selected.map((q) => {
    const shuffledOriginals = shuffle([...OPTION_KEYS]);
    const map: Record<string, string> = {};
    const options: Record<string, string> = {};

    shuffledOriginals.forEach((orig, idx) => {
      const display = OPTION_KEYS[idx];
      map[display] = orig;
      options[display] = getOptionText(q as unknown as Record<string, unknown>, orig);
    });

    questionData.push({ qid: q.id, map });
    return { id: q.id, questionText: q.questionText, options };
  });

  const attempt = await prisma.testAttempt.create({
    data: {
      userId,
      categoryId,
      status: "IN_PROGRESS",
      isRetry,
      retryFeePaid,
      questionData,
      startedAt: new Date(),
    },
  });

  return NextResponse.json({
    attemptId: attempt.id,
    questions: safeQuestions,
    config: { passPercentage: config.passPercentage, questionCount: config.questionCount },
  });
}
