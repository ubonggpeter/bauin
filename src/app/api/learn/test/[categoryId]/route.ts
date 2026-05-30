import { NextResponse } from "next/server";
import { getCategoryQuestions } from "@/lib/test-questions";

export async function GET(
  _req: Request,
  { params }: { params: { categoryId: string } }
) {
  const data = getCategoryQuestions(params.categoryId);
  if (!data) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  // Strip correct answer — never sent to client
  const safeQuestions = data.questions.map(({ correct: _stripped, ...q }) => q);

  return NextResponse.json({ questions: safeQuestions, config: data.config });
}
