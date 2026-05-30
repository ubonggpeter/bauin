/**
 * GET /api/wallet
 * Returns balance cards, last-30-day chart data, recent transactions, and viewer lock stats.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const EARN_TYPES = [
  "REFERRAL_BONUS",
  "BET_PAYOUT",
  "STORY_PURCHASE",
  "INVESTMENT_RETURN",
] as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [wallet, transactions, recentEarnings, viewerReferrals] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.transaction.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      take:    60,
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        status:    "COMPLETED",
        type:      { in: [...EARN_TYPES] },
        createdAt: { gte: thirtyDaysAgo },
      },
      select:  { amount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.referral.findMany({
      where:   { referrerId: userId, type: "VIEWER", earningsUnlocked: false },
      include: { earnings: { where: { source: "VIEWER_QUIZ_LOCKED" } } },
    }),
  ]);

  // Build 30-day chart: one entry per day
  const dayMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const tx of recentEarnings) {
    const key = tx.createdAt.toISOString().slice(0, 10);
    if (dayMap.has(key)) {
      dayMap.set(key, (dayMap.get(key) ?? 0) + Number(tx.amount));
    }
  }
  const chartData = Array.from(dayMap.entries()).map(([date, amount]) => ({ date, amount }));

  // Viewer lock stats
  const viewerLockedTotal = viewerReferrals.reduce(
    (sum, r) => sum + r.earnings.reduce((s, e) => s + Number(e.amount), 0),
    0,
  );
  const viewerRecruits = viewerReferrals.length;
  const maxThreshold   = viewerReferrals.length > 0
    ? Math.max(...viewerReferrals.map((r) => r.unlockThreshold))
    : 30;

  return NextResponse.json({
    balance:        wallet ? Number(wallet.balance)        : 0,
    totalEarned:    wallet ? Number(wallet.totalEarned)    : 0,
    totalWithdrawn: wallet ? Number(wallet.totalWithdrawn) : 0,
    chartData,
    transactions: transactions.map((tx) => ({
      id:          tx.id,
      type:        tx.type,
      amount:      Number(tx.amount),
      description: tx.description,
      reference:   tx.reference,
      status:      tx.status,
      createdAt:   tx.createdAt.toISOString(),
    })),
    viewerLocked: {
      total:            viewerLockedTotal,
      recruits:         viewerRecruits,
      unlockThreshold:  maxThreshold,
    },
  });
}
