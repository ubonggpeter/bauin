import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { catId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { catId } = params;

  const category = await prisma.category.findUnique({
    where: { id: catId },
    include: {
      courses: {
        orderBy: { order: "asc" },
        include: {
          topics: {
            orderBy: { order: "asc" },
            include: {
              subTopics: {
                orderBy: { order: "asc" },
                select: { id: true, title: true, mediaUrl: true, order: true },
              },
            },
          },
        },
      },
    },
  });

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const allSubIds = category.courses.flatMap((c) =>
    c.topics.flatMap((t) => t.subTopics.map((s) => s.id))
  );

  const progressRecords = await prisma.userTopicProgress.findMany({
    where: { userId, subTopicId: { in: allSubIds } },
    select: { subTopicId: true, completed: true },
  });
  const progressMap = new Map(progressRecords.map((p) => [p.subTopicId, p.completed]));

  const courses = category.courses.map((course) => ({
    id: course.id,
    title: course.title,
    topics: course.topics.map((topic) => ({
      id: topic.id,
      title: topic.title,
      subTopics: topic.subTopics.map((sub) => ({
        id: sub.id,
        title: sub.title,
        mediaUrl: sub.mediaUrl,
        completed: progressMap.get(sub.id) ?? false,
      })),
    })),
  }));

  return NextResponse.json({ categoryId: catId, name: category.name, courses });
}
