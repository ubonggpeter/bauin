import { prisma } from "@/lib/db";
import { creditWallet, makeRef } from "@/lib/server/wallet";
import { grantAchievementByKey } from "@/lib/server/achievements";

// ── Definitions ────────────────────────────────────────────────────────────────

const DEFS = [
  {
    type:     "USERS_100",
    label:    "100 Members",
    headline: "🎉 BAUIN just hit 100 members!",
    badgeKey: "MS_USERS_100" as const,
    check:    async () => (await prisma.user.count()) >= 100,
  },
  {
    type:     "USERS_1K",
    label:    "1,000 Members",
    headline: "🚀 1,000 BAUIN members strong!",
    badgeKey: "MS_USERS_1K" as const,
    check:    async () => (await prisma.user.count()) >= 1_000,
  },
  {
    type:     "USERS_10K",
    label:    "10,000 Members",
    headline: "🌍 10,000 BAUIN members worldwide!",
    badgeKey: "MS_USERS_10K" as const,
    check:    async () => (await prisma.user.count()) >= 10_000,
  },
  {
    type:     "PAID_1M",
    label:    "₦1M Paid Out",
    headline: "💰 BAUIN has paid out ₦1,000,000 to members!",
    badgeKey: "MS_PAID_1M" as const,
    check:    async () => {
      const agg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: "WITHDRAWAL", status: "COMPLETED" },
      });
      return Number(agg._sum.amount ?? 0) >= 1_000_000;
    },
  },
  {
    type:     "PAID_100M",
    label:    "₦100M Paid Out",
    headline: "💎 BAUIN has paid out ₦100,000,000 to members!",
    badgeKey: "MS_PAID_100M" as const,
    check:    async () => {
      const agg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: "WITHDRAWAL", status: "COMPLETED" },
      });
      return Number(agg._sum.amount ?? 0) >= 100_000_000;
    },
  },
] as const;

// ── Active users for bonus/badge distribution ─────────────────────────────────

async function getActiveUserIds(): Promise<string[]> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const users = await prisma.user.findMany({
    where:  { isActive: true, lastLoginAt: { gte: cutoff } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

// ── Fire a single milestone ───────────────────────────────────────────────────

async function fireMilestone(def: (typeof DEFS)[number]): Promise<void> {
  const bannerExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Atomic claim — unique constraint rejects duplicate fires
  try {
    await prisma.milestone.create({
      data: {
        type:     def.type,
        label:    def.label,
        headline: def.headline,
        bannerExpiresAt,
      },
    });
  } catch {
    return; // already claimed by another instance
  }

  // Distribute ₦500 bonus + badge to all active users
  const userIds = await getActiveUserIds();

  for (const userId of userIds) {
    await creditWallet(
      userId,
      500,
      "MILESTONE_BONUS",
      `${def.label} milestone — ₦500 community bonus`,
      makeRef("MS", userId),
    ).catch(() => {});

    await grantAchievementByKey(userId, def.badgeKey).catch(() => {});
  }

  await prisma.milestone.update({
    where: { type: def.type },
    data:  { bonusPaid: true, usersRewarded: userIds.length },
  });
}

// ── Public: check + fire any newly-hit milestones ────────────────────────────

export async function checkAndFireMilestones(): Promise<void> {
  const existing = await prisma.milestone.findMany({ select: { type: true } });
  const fired    = new Set(existing.map((m) => m.type));

  for (const def of DEFS) {
    if (fired.has(def.type)) continue;
    try {
      const hit = await def.check();
      if (hit) fireMilestone(def).catch((e) => console.error("[milestones]", e));
    } catch (e) {
      console.error("[milestones] check failed for", def.type, e);
    }
  }
}

// ── Public: return milestones whose banners are still active ─────────────────

export type ActiveMilestone = {
  type:           string;
  label:          string;
  headline:       string;
  hitAt:          string;
  bannerExpiresAt:string;
};

export async function getActiveBanners(): Promise<ActiveMilestone[]> {
  const rows = await prisma.milestone.findMany({
    where:   { bannerExpiresAt: { gt: new Date() } },
    orderBy: { hitAt: "asc" },
  });
  return rows.map((r) => ({
    type:            r.type,
    label:           r.label,
    headline:        r.headline,
    hitAt:           r.hitAt.toISOString(),
    bannerExpiresAt: r.bannerExpiresAt.toISOString(),
  }));
}
