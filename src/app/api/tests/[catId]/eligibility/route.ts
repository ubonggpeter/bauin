import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCategoryConfig, getNextRetryAt } from "@/lib/server/settings";

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

  const subscription = await prisma.userCategory.findUnique({
    where: { userId_categoryId: { userId, categoryId: catId } },
  });
  if (!subscription?.isActive) {
    return NextResponse.json({ eligible: false, reason: "NOT_SUBSCRIBED" });
  }

  const category = await prisma.category.findUnique({
    where: { id: catId },
    include: {
      courses: {
        include: {
          topics: {
            include: { subTopics: { select: { id: true } } },
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

  if (allSubIds.length > 0) {
    const completedCount = await prisma.userTopicProgress.count({
      where: { userId, subTopicId: { in: allSubIds }, completed: true },
    });

    if (completedCount < allSubIds.length) {
      return NextResponse.json({
        eligible: false,
        reason: "TOPICS_INCOMPLETE",
        completedSubs: completedCount,
        totalSubs: allSubIds.length,
      });
    }
  }

  const lastAttempt = await prisma.testAttempt.findFirst({
    where: { userId, categoryId: catId },
    orderBy: { createdAt: "desc" },
  });

  if (lastAttempt?.status === "IN_PROGRESS") {
    return NextResponse.json({ eligible: true, reason: "IN_PROGRESS", resumeAttemptId: lastAttempt.id });
  }

  if (lastAttempt?.status === "CERTIFIED") {
    return NextResponse.json({ eligible: true, reason: "CERTIFIED", alreadyCertified: true });
  }

  if (lastAttempt?.status === "FAILED") {
    const config = await getCategoryConfig(catId);
    if (config) {
      const nextRetry = getNextRetryAt(lastAttempt.completedAt ?? lastAttempt.createdAt, config.retryPolicy);
      if (nextRetry && new Date() < nextRetry) {
        return NextResponse.json({
          eligible: false,
          reason: "RETRY_LOCKED",
          nextRetryAt: nextRetry.toISOString(),
          retryPolicy: config.retryPolicy,
          retryFee: config.retryFee,
        });
      }
    }
  }

  const config = await getCategoryConfig(catId);
  return NextResponse.json({
    eligible: true,
    passPercentage: config?.passPercentage ?? 70,
    questionCount: config?.questionCount ?? 10,
    retryPolicy: config?.retryPolicy ?? "IMMEDIATE",
    retryFee: config?.retryFee ?? 0,
  });
}
