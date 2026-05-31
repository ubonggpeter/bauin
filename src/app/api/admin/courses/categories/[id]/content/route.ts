/**
 * GET /api/admin/courses/categories/[id]/content
 * Returns category + courses → topics → subtopics tree.
 * Auto-creates a "Default Course" if the category has none.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const category = await prisma.category.findUnique({ where: { id: params.id } });
  if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Ensure at least one course exists
  let courses = await prisma.course.findMany({
    where: { categoryId: params.id },
    orderBy: { order: "asc" },
    include: {
      topics: {
        orderBy: { order: "asc" },
        include: { subTopics: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (courses.length === 0) {
    const defaultCourse = await prisma.course.create({
      data: { categoryId: params.id, title: "Default Course", isPublished: false, order: 0 },
      include: { topics: { include: { subTopics: true } } },
    });
    courses = [defaultCourse];
  }

  return NextResponse.json({ category, courses });
}
