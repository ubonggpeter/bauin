import { NextResponse } from "next/server";
import { getCategoryQuestions } from "@/lib/test-questions";

type SubmitBody = {
  answers: Record<string, string>; // questionId → "A"|"B"|"C"|"D"
};

export async function POST(
  req: Request,
  { params }: { params: { categoryId: string } }
) {
  const data = getCategoryQuestions(params.categoryId);
  if (!data) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  let body: SubmitBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { answers } = body;

  // 2 questions per topic (10 questions / 5 topics)
  const breakdown = data.questions.map((q, idx) => {
    const topicIndex = Math.floor(idx / 2);
    return {
      id: q.id,
      question: q.question,
      options: q.options,
      yourAnswer: answers[q.id] ?? null,
      correctAnswer: q.correct,
      isCorrect: answers[q.id] === q.correct,
      topicIndex,
      topicTitle: data.topicTitles[topicIndex] ?? `Topic ${topicIndex + 1}`,
    };
  });

  const correct = breakdown.filter((b) => b.isCorrect).length;
  const total = data.questions.length;
  const score = Math.round((correct / total) * 100);
  const passed = score >= data.config.passPercent;

  return NextResponse.json({
    correct,
    total,
    score,
    passed,
    breakdown,
    passPercent: data.config.passPercent,
    topicTitles: data.topicTitles,
  });
}
