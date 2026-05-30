/**
 * GET /api/admin/stats
 * Returns dashboard stats cards + 30-day multi-line chart data.
 * Protected by admin session cookie.
 */
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    activeUsers,
    pendingKyc,
    totalRevenueTx,
    pendingWithdrawals,
    pendingWithdrawalVolume,
    activeInvestments,
    totalInvestmentVolume,
    recentTransactions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { kycStatus: "SUBMITTED" } }),
    prisma.transaction.aggregate({
      where: { type: "DEPOSIT" },
      _sum: { amount: true },
    }),
    prisma.withdrawalRequest.count({ where: { status: { in: ["QUEUED", "PENDING_ADMIN", "PROCESSING"] } } }),
    prisma.withdrawalRequest.aggregate({
      where: { status: { in: ["QUEUED", "PENDING_ADMIN", "PROCESSING"] } },
      _sum: { amount: true },
    }),
    prisma.investment.count({ where: { status: "ACTIVE" } }),
    prisma.investment.aggregate({
      where: {},
      _sum: { amount: true },
    }),
    // Last 30 days transactions for chart
    prisma.transaction.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { type: true, amount: true, createdAt: true },
    }),
  ]);

  // Build 30-day chart: revenue (DEPOSIT), withdrawals (WITHDRAWAL), investment returns (INVESTMENT_RETURN)
  const dayMap = new Map<string, { revenue: number; withdrawals: number; investments: number }>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    dayMap.set(d.toISOString().slice(0, 10), { revenue: 0, withdrawals: 0, investments: 0 });
  }

  for (const tx of recentTransactions) {
    const key = tx.createdAt.toISOString().slice(0, 10);
    const slot = dayMap.get(key);
    if (!slot) continue;
    const amt = Number(tx.amount);
    if (tx.type === "DEPOSIT") slot.revenue += amt;
    else if (tx.type === "WITHDRAWAL") slot.withdrawals += amt;
    else if (tx.type === "INVESTMENT_RETURN") slot.investments += amt;
  }

  const chartData = Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v }));

  return NextResponse.json({
    stats: {
      totalUsers,
      activeUsers,
      pendingKyc,
      totalRevenue: Number(totalRevenueTx._sum.amount ?? 0),
      pendingWithdrawals,
      pendingWithdrawalVolume: Number(pendingWithdrawalVolume._sum.amount ?? 0),
      activeInvestments,
      totalInvestmentVolume: Number(totalInvestmentVolume._sum.amount ?? 0),
    },
    chartData,
  });
}
