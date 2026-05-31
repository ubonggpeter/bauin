/**
 * GET  /api/admin/courses/categories/[id]/questions  — list questions (paginated)
 * POST /api/admin/courses/categories/[id]/questions  — add question
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const skip  = (page - 1) * limit;

  const [questions, total] = await Promise.all([
    prisma.testQuestion.findMany({
      where:   { categoryId: params.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.testQuestion.count({ where: { categoryId: params.id } }),
  ]);

  return NextResponse.json({ questions, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    questionText: string;
    optionA: string; optionB: string; optionC: string; optionD: string;
    correctOption: "A" | "B" | "C" | "D";
    explanation?: string;
  };

  if (!body.questionText?.trim()) return NextResponse.json({ error: "Question text required" }, { status: 400 });
  if (!["A", "B", "C", "D"].includes(body.correctOption)) {
    return NextResponse.json({ error: "correctOption must be A, B, C, or D" }, { status: 400 });
  }

  const question = await prisma.testQuestion.create({
    data: {
      categoryId:    params.id,
      questionText:  body.questionText.trim(),
      optionA:       body.optionA?.trim() ?? "",
      optionB:       body.optionB?.trim() ?? "",
      optionC:       body.optionC?.trim() ?? "",
      optionD:       body.optionD?.trim() ?? "",
      correctOption: body.correctOption as never,
      explanation:   body.explanation ?? null,
    },
  });

  return NextResponse.json({ question }, { status: 201 });
}
