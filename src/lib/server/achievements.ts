import { prisma } from "@/lib/db";
import { creditWallet, makeRef } from "@/lib/server/wallet";

// ── Catalog ────────────────────────────────────────────────────────────────────

const CATALOG = [
  { key: "FIRST_CERT",    name: "First Certified",      description: "Earned your first certification",             icon: "🏆" },
  { key: "PERFECT_SCORE", name: "Perfect Score",         description: "Scored 100% on a certification test",        icon: "💯" },
  { key: "FAST_FINISHER", name: "Fast Finisher",         description: "Completed a test in under 5 minutes",        icon: "⚡" },
  { key: "THREE_CERTS",   name: "Triple Certified",      description: "Earned 3 certifications",                    icon: "🥉" },
  { key: "FIVE_CERTS",    name: "Five Star",             description: "Earned 5 certifications",                    icon: "⭐" },
  { key: "ALL_CERTS",     name: "Billionaire Scholar",   description: "Completed all available certifications",      icon: "💎" },
  { key: "QUIZ_WINNER",   name: "Quiz Champion",         description: "Won first place in a quiz",                  icon: "🥇" },
  { key: "FIRST_SALE",    name: "First Sale",            description: "Made your first story sale",                 icon: "📖" },
  { key: "REFERRAL_BOSS", name: "Referral Boss",         description: "Unlocked a referral earnings stream",        icon: "🤝" },
  { key: "STREAK_7",      name: "Week Warrior",          description: "Logged in 7 days in a row",                  icon: "🔥" },
  { key: "STREAK_30",     name: "Monthly Master",        description: "Logged in 30 days in a row",                 icon: "🌟" },
  { key: "EARNER_50K",    name: "₦50K Club",             description: "Earned a total of ₦50,000",                  icon: "💰" },
  { key: "EARNER_500K",   name: "₦500K Elite",           description: "Earned a total of ₦500,000",                 icon: "💎" },
  { key: "JOB_DONE",      name: "Job Done",              description: "Completed your first job",                   icon: "✅" },
  { key: "RELIABLE",      name: "Reliable",              description: "Completed 20+ jobs all submitted on time",    icon: "🌟" },
  // ── Platform milestones ──────────────────────────────────────────────────────
  { key: "MS_USERS_100",  name: "Pioneer",               description: "Active when BAUIN reached 100 members",        icon: "🌱" },
  { key: "MS_USERS_1K",   name: "Early Adopter",         description: "Active when BAUIN reached 1,000 members",      icon: "🚀" },
  { key: "MS_USERS_10K",  name: "Community Builder",     description: "Active when BAUIN reached 10,000 members",     icon: "🌍" },
  { key: "MS_PAID_1M",    name: "₦1M Club",              description: "Active when BAUIN paid out ₦1,000,000",        icon: "💰" },
  { key: "MS_PAID_100M",  name: "₦100M Legend",          description: "Active when BAUIN paid out ₦100,000,000",      icon: "💎" },
] as const;

type CatalogKey = typeof CATALOG[number]["key"];

// ── Event types ────────────────────────────────────────────────────────────────

export type AchievementEvent =
  | { type: "TEST_PASSED";         score: number; durationSec?: number }
  | { type: "JOB_COMPLETED" }
  | { type: "STORY_SOLD" }
  | { type: "QUIZ_WON";            rank: number }
  | { type: "REFERRAL_UNLOCKED" }
  | { type: "STREAK_7" }
  | { type: "STREAK_30" }
  | { type: "EARNED_50K" }
  | { type: "EARNED_500K" };

// ── Internal helpers ───────────────────────────────────────────────────────────

async function grantAchievement(userId: string, key: CatalogKey): Promise<boolean> {
  const def = CATALOG.find((a) => a.key === key);
  if (!def) return false;

  const achievement = await prisma.achievement.upsert({
    where:  { key },
    create: { key: def.key, name: def.name, description: def.description, icon: def.icon },
    update: {},
  });

  try {
    await prisma.userAchievement.create({
      data: { userId, achievementId: achievement.id },
    });
    return true;
  } catch {
    return false; // already earned (unique constraint)
  }
}

async function alreadyEarned(userId: string, key: string): Promise<boolean> {
  const count = await prisma.userAchievement.count({
    where: { userId, achievement: { key } },
  });
  return count > 0;
}

async function creditBonus(userId: string, amount: number, description: string): Promise<void> {
  try {
    await creditWallet(
      userId,
      amount,
      "ACHIEVEMENT_BONUS",
      description,
      makeRef("ACH", userId),
    );
  } catch { /* wallet may not exist yet */ }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function checkAchievements(
  userId:  string,
  event:   AchievementEvent,
): Promise<void> {
  try {
    switch (event.type) {
      case "TEST_PASSED": {
        const certCount = await prisma.userCertificate.count({ where: { userId } });
        if (certCount >= 1) await grantAchievement(userId, "FIRST_CERT");
        if (certCount >= 3) await grantAchievement(userId, "THREE_CERTS");
        if (certCount >= 5) await grantAchievement(userId, "FIVE_CERTS");

        if (event.score === 100)                         await grantAchievement(userId, "PERFECT_SCORE");
        if ((event.durationSec ?? 999) <= 300)           await grantAchievement(userId, "FAST_FINISHER");

        const totalCats = await prisma.category.count({ where: { isActive: true } });
        if (totalCats > 0 && certCount >= totalCats)     await grantAchievement(userId, "ALL_CERTS");
        break;
      }

      case "JOB_COMPLETED":
        await grantAchievement(userId, "JOB_DONE");
        await checkReliableBadge(userId);
        break;

      case "STORY_SOLD":
        await grantAchievement(userId, "FIRST_SALE");
        break;

      case "QUIZ_WON":
        if (event.rank === 1) await grantAchievement(userId, "QUIZ_WINNER");
        break;

      case "REFERRAL_UNLOCKED":
        await grantAchievement(userId, "REFERRAL_BOSS");
        break;

      case "STREAK_7":
        await grantAchievement(userId, "STREAK_7");
        break;

      case "STREAK_30":
        await grantAchievement(userId, "STREAK_30");
        break;

      case "EARNED_50K":
        await grantAchievement(userId, "EARNER_50K");
        break;

      case "EARNED_500K":
        await grantAchievement(userId, "EARNER_500K");
        break;
    }
  } catch (err) {
    console.error("[achievements] checkAchievements error:", err);
  }
}

// ── Login streak ───────────────────────────────────────────────────────────────

export async function updateLoginStreak(
  userId: string,
): Promise<{ streak: number; bonusAwarded: number }> {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { loginStreak: true, loginStreakUpdatedAt: true },
    });
    if (!user) return { streak: 0, bonusAwarded: 0 };

    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last  = user.loginStreakUpdatedAt
      ? new Date(
          user.loginStreakUpdatedAt.getFullYear(),
          user.loginStreakUpdatedAt.getMonth(),
          user.loginStreakUpdatedAt.getDate(),
        )
      : null;

    // Already updated today — nothing to do
    if (last && last.getTime() === today.getTime()) {
      return { streak: user.loginStreak, bonusAwarded: 0 };
    }

    const daysDiff = last
      ? Math.round((today.getTime() - last.getTime()) / 86_400_000)
      : 999;

    const newStreak = daysDiff === 1 ? user.loginStreak + 1 : 1;

    await prisma.user.update({
      where: { id: userId },
      data:  { loginStreak: newStreak, loginStreakUpdatedAt: now },
    });

    let bonusAwarded = 0;

    if (newStreak === 7) {
      if (!(await alreadyEarned(userId, "STREAK_7"))) {
        await creditBonus(userId, 500, "7-day login streak bonus");
        bonusAwarded = 500;
      }
      await checkAchievements(userId, { type: "STREAK_7" });
    } else if (newStreak === 30) {
      if (!(await alreadyEarned(userId, "STREAK_30"))) {
        await creditBonus(userId, 2000, "30-day login streak bonus");
        bonusAwarded = 2000;
      }
      await checkAchievements(userId, { type: "STREAK_30" });
    }

    return { streak: newStreak, bonusAwarded };
  } catch (err) {
    console.error("[achievements] updateLoginStreak error:", err);
    return { streak: 0, bonusAwarded: 0 };
  }
}

// ── Check earnings milestones (call after any wallet credit) ───────────────────

export async function checkEarningsMilestones(userId: string): Promise<void> {
  try {
    const wallet = await prisma.wallet.findUnique({
      where:  { userId },
      select: { totalEarned: true },
    });
    if (!wallet) return;

    const earned = Number(wallet.totalEarned);
    if (earned >= 500_000) {
      await checkAchievements(userId, { type: "EARNED_500K" });
    } else if (earned >= 50_000) {
      await checkAchievements(userId, { type: "EARNED_50K" });
    }
  } catch (err) {
    console.error("[achievements] checkEarningsMilestones error:", err);
  }
}

// ── Reliable badge ─────────────────────────────────────────────────────────────
// Awarded once a worker has 20+ APPROVED jobs where submittedAt <= deadline.

export async function checkReliableBadge(userId: string): Promise<void> {
  try {
    if (await alreadyEarned(userId, "RELIABLE")) return;

    const onTimeCount = await prisma.job.count({
      where: {
        assignedWorkerId: userId,
        status:           "APPROVED",
        submittedAt:      { not: null },
        // submittedAt <= deadline — Prisma doesn't support cross-field comparison
        // so we fetch the count via raw condition
      },
    });

    if (onTimeCount < 20) return;

    // Verify each one was on time (submittedAt <= deadline)
    const jobs = await prisma.job.findMany({
      where:  { assignedWorkerId: userId, status: "APPROVED", submittedAt: { not: null } },
      select: { submittedAt: true, deadline: true },
    });

    const onTime = jobs.filter(
      (j) => j.submittedAt !== null && j.submittedAt <= j.deadline,
    );

    if (onTime.length >= 20) {
      await grantAchievement(userId, "RELIABLE");
    }
  } catch (err) {
    console.error("[achievements] checkReliableBadge error:", err);
  }
}

// ── Catalog for display ────────────────────────────────────────────────────────

export function getAchievementCatalog() {
  return CATALOG.map((a) => ({ ...a }));
}

// ── Grant by key (used by milestones system) ───────────────────────────────────

export async function grantAchievementByKey(userId: string, key: CatalogKey): Promise<boolean> {
  return grantAchievement(userId, key);
}
