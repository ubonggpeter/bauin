/**
 * PATCH  /api/admin/courses/questions/[id]  — edit question
 * DELETE /api/admin/courses/questions/[id]  — delete question
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    questionText?: string;
    optionA?: string; optionB?: string; optionC?: string; optionD?: string;
    correctOption?: "A" | "B" | "C" | "D";
    explanation?: string;
    isActive?: boolean;
  };

  const data: Record<string, unknown> = {};
  if (body.questionText  !== undefined) data.questionText  = body.questionText.trim();
  if (body.optionA       !== undefined) data.optionA       = body.optionA.trim();
  if (body.optionB       !== undefined) data.optionB       = body.optionB.trim();
  if (body.optionC       !== undefined) data.optionC       = body.optionC.trim();
  if (body.optionD       !== undefined) data.optionD       = body.optionD.trim();
  if (body.correctOption !== undefined) data.correctOption = body.correctOption;
  if (body.explanation   !== undefined) data.explanation   = body.explanation;
  if (body.isActive      !== undefined) data.isActive      = body.isActive;

  const question = await prisma.testQuestion.update({ where: { id: params.id }, data: data as never });
  return NextResponse.json({ question });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.testQuestion.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
