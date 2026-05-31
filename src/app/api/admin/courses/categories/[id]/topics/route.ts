/**
 * POST /api/admin/courses/categories/[id]/topics
 * Creates a topic inside the category's first (default) course.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { title: string; description?: string };
  if (!body.title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  // Get or create default course
  let course = await prisma.course.findFirst({ where: { categoryId: params.id }, orderBy: { order: "asc" } });
  if (!course) {
    course = await prisma.course.create({
      data: { categoryId: params.id, title: "Default Course", isPublished: false, order: 0 },
    });
  }

  const maxOrder = await prisma.topic.aggregate({ where: { courseId: course.id }, _max: { order: true } });
  const topic = await prisma.topic.create({
    data: {
      courseId:    course.id,
      title:       body.title.trim(),
      description: body.description ?? null,
      order:       (maxOrder._max.order ?? 0) + 1,
    },
    include: { subTopics: true },
  });

  return NextResponse.json({ topic }, { status: 201 });
}
