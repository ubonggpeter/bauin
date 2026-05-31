/**
 * GET /api/achievements
 * Returns the full achievement catalog with earned status for the current user.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAchievementCatalog } from "@/lib/server/achievements";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const earned = await prisma.userAchievement.findMany({
    where:   { userId },
    include: { achievement: true },
    orderBy: { earnedAt: "asc" },
  });

  const earnedKeys = new Set(earned.map((ua) => ua.achievement.key));
  const catalog    = getAchievementCatalog();

  const achievements = catalog.map((def) => ({
    ...def,
    earned:   earnedKeys.has(def.key),
    earnedAt: earned.find((ua) => ua.achievement.key === def.key)?.earnedAt ?? null,
  }));

  return NextResponse.json({ achievements, earnedCount: earnedKeys.size, totalCount: catalog.length });
}
