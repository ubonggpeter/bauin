/**
 * GET  /api/admin/courses/categories       — list all categories
 * POST /api/admin/courses/categories       — create category
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { testQuestions: true, userCategories: true, courses: true } },
    },
  });

  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    name: string; description?: string;
    registrationFee: number; monthlyFee: number; retryFee: number;
    retryPolicy: string; passPercentage: number; questionCount: number;
  };

  if (!body.name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const slug = body.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const category = await prisma.category.create({
    data: {
      name: body.name.trim(),
      slug,
      description: body.description ?? null,
      registrationFee: body.registrationFee ?? 0,
      monthlyFee:      body.monthlyFee      ?? 0,
      retryFee:        body.retryFee        ?? 0,
      retryPolicy:     (body.retryPolicy ?? "IMMEDIATE") as never,
      passPercentage:  body.passPercentage  ?? 70,
      questionCount:   body.questionCount   ?? 20,
    },
  });

  return NextResponse.json({ category }, { status: 201 });
}
