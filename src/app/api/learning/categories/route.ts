import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const userCategories = await prisma.userCategory.findMany({
    where: { userId, isActive: true },
    include: {
      category: {
        include: {
          courses: {
            include: {
              topics: {
                include: {
                  subTopics: { select: { id: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const allSubIds = userCategories.flatMap((uc) =>
    uc.category.courses.flatMap((c) => c.topics.flatMap((t) => t.subTopics.map((s) => s.id)))
  );

  const [progressRecords, certs] = await Promise.all([
    prisma.userTopicProgress.findMany({
      where: { userId, subTopicId: { in: allSubIds }, completed: true },
      select: { subTopicId: true },
    }),
    prisma.userCertificate.findMany({
      where: { userId },
      select: { categoryId: true, score: true },
    }),
  ]);

  const completedSet = new Set(progressRecords.map((p) => p.subTopicId));
  const certMap = new Map(certs.map((c) => [c.categoryId, c.score]));

  const categories = userCategories.map((uc) => {
    const subIds = uc.category.courses.flatMap((c) =>
      c.topics.flatMap((t) => t.subTopics.map((s) => s.id))
    );
    const totalSubs = subIds.length;
    const completedSubs = subIds.filter((id) => completedSet.has(id)).length;
    const progressPct = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;
    const certScore = certMap.get(uc.categoryId);

    return {
      id: uc.categoryId,
      name: uc.category.name,
      slug: uc.category.slug,
      description: uc.category.description,
      progressPct,
      completedSubs,
      totalSubs,
      certified: certScore != null,
      certScore: certScore ?? null,
      allComplete: totalSubs > 0 && completedSubs === totalSubs,
      passPercentage: uc.category.passPercentage,
      retryPolicy: uc.category.retryPolicy,
      retryFee: Number(uc.category.retryFee),
      subscribedAt: uc.subscribedAt,
    };
  });

  return NextResponse.json({ categories });
}
