import { prisma } from "@/lib/db";

const ACHIEVEMENT_CATALOG = [
  {
    key: "FIRST_CERT",
    name: "First Certified",
    description: "Earned your first certification",
    icon: "🏆",
  },
  {
    key: "PERFECT_SCORE",
    name: "Perfect Score",
    description: "Scored 100% on a certification test",
    icon: "💯",
  },
  {
    key: "FAST_FINISHER",
    name: "Fast Finisher",
    description: "Completed a test in under 5 minutes",
    icon: "⚡",
  },
  {
    key: "THREE_CERTS",
    name: "Triple Certified",
    description: "Earned 3 certifications",
    icon: "🥉",
  },
  {
    key: "FIVE_CERTS",
    name: "Five Star",
    description: "Earned 5 certifications",
    icon: "⭐",
  },
  {
    key: "ALL_CERTS",
    name: "Billionaire Scholar",
    description: "Completed all available certifications",
    icon: "💎",
  },
] as const;

type AchievementContext = {
  score?: number;
  durationSec?: number;
};

export async function checkAchievements(
  userId: string,
  context: AchievementContext
): Promise<void> {
  const earned: string[] = [];

  const certCount = await prisma.userCertificate.count({ where: { userId } });

  if (certCount >= 1) earned.push("FIRST_CERT");
  if (certCount >= 3) earned.push("THREE_CERTS");
  if (certCount >= 5) earned.push("FIVE_CERTS");

  if (context.score === 100) earned.push("PERFECT_SCORE");

  if (context.durationSec != null && context.durationSec <= 300) {
    earned.push("FAST_FINISHER");
  }

  if (earned.length === 0) return;

  const existing = await prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
  });
  const existingKeys = new Set(existing.map((ua) => ua.achievement.key));

  for (const key of earned) {
    if (existingKeys.has(key)) continue;

    const def = ACHIEVEMENT_CATALOG.find((a) => a.key === key);
    if (!def) continue;

    const achievement = await prisma.achievement.upsert({
      where: { key },
      create: { key: def.key, name: def.name, description: def.description, icon: def.icon },
      update: {},
    });

    await prisma.userAchievement.create({
      data: { userId, achievementId: achievement.id },
    });
  }
}
