/**
 * GET /api/admin/analytics
 * Returns user funnel, leaderboards, quiz stats, and memory game analytics.
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

  // ── Funnel ──────────────────────────────────────────────────────────────────
  const [registered, verified, paid, certified, activeWorkers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
    prisma.user.count({ where: { userCategories: { some: { paidRegistration: true } } } }),
    prisma.user.count({ where: { certificates: { some: {} } } }),
    prisma.wallet.count({ where: { totalEarned: { gt: 0 } } }),
  ]);

  const funnelSteps = [
    { label: "Registered", count: registered },
    { label: "Verified", count: verified },
    { label: "Paid", count: paid },
    { label: "Certified", count: certified },
    { label: "Active Worker", count: activeWorkers },
  ].map((step, i, arr) => ({
    ...step,
    dropOffPct: i === 0 ? 0 : arr[i - 1].count > 0
      ? Math.round((1 - step.count / arr[i - 1].count) * 100)
      : 0,
  }));

  // ── Leaderboards ─────────────────────────────────────────────────────────────
  const [topEarnerWallets, topSellerWallets, topDistributorWallets, topReferrersTx] = await Promise.all([
    prisma.wallet.findMany({
      where: { totalEarned: { gt: 0 } },
      orderBy: { totalEarned: "desc" },
      take: 10,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.wallet.findMany({
      where: { totalEarned: { gt: 0 }, user: { role: "SELLER" } },
      orderBy: { totalEarned: "desc" },
      take: 10,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.wallet.findMany({
      where: { totalEarned: { gt: 0 }, user: { role: "DISTRIBUTOR" } },
      orderBy: { totalEarned: "desc" },
      take: 10,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.transaction.groupBy({
      by: ["userId"],
      where: { type: "REFERRAL_BONUS", status: "COMPLETED" },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    }),
  ]);

  const referrerIds = topReferrersTx.map((r) => r.userId);
  const referrerUsers = referrerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: referrerIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const referrerMap = Object.fromEntries(referrerUsers.map((u) => [u.id, u]));

  const leaderboards = {
    topEarners: topEarnerWallets.map((w) => ({
      name: w.user.name,
      email: w.user.email,
      totalEarned: Number(w.totalEarned),
    })),
    topSellers: topSellerWallets.map((w) => ({
      name: w.user.name,
      email: w.user.email,
      totalEarned: Number(w.totalEarned),
    })),
    topDistributors: topDistributorWallets.map((w) => ({
      name: w.user.name,
      email: w.user.email,
      totalEarned: Number(w.totalEarned),
    })),
    topReferrers: topReferrersTx.map((r) => ({
      name: referrerMap[r.userId]?.name ?? "Unknown",
      email: referrerMap[r.userId]?.email ?? "",
      total: Number(r._sum.amount ?? 0),
    })),
  };

  // ── Quiz daily chart (30d) ───────────────────────────────────────────────────
  const quizSessions30d = await prisma.quizSession.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true, _count: { select: { entries: true } } },
  });

  const quizDayMap = new Map<string, { sessions: number; players: number }>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    quizDayMap.set(d.toISOString().slice(0, 10), { sessions: 0, players: 0 });
  }
  for (const s of quizSessions30d) {
    const key = s.createdAt.toISOString().slice(0, 10);
    const slot = quizDayMap.get(key);
    if (!slot) continue;
    slot.sessions += 1;
    slot.players += s._count.entries;
  }
  const quizDailyData = Array.from(quizDayMap.entries()).map(([date, v]) => ({ date, ...v }));

  // Quiz summary
  const [totalQuizSessions, totalBets, settledBets, quizEntryGroups] = await Promise.all([
    prisma.quizSession.count(),
    prisma.bet.count(),
    prisma.bet.count({ where: { status: "SETTLED" } }),
    prisma.quizEntry.groupBy({
      by: ["quizSessionId"],
      _count: { id: true },
    }),
  ]);

  const avgPlayersPerSession = quizEntryGroups.length > 0
    ? quizEntryGroups.reduce((sum, r) => sum + r._count.id, 0) / quizEntryGroups.length
    : 0;
  const betWinRate = totalBets > 0 ? Math.round((settledBets / totalBets) * 100) : 0;

  const quizSummary = {
    totalSessions: totalQuizSessions,
    avgPlayersPerSession: Math.round(avgPlayersPerSession * 10) / 10,
    betWinRate,
  };

  // ── Memory game analytics ────────────────────────────────────────────────────
  const [memoryAvg, totalEntries, p1, p2, p3, p4, p5] = await Promise.all([
    prisma.quizEntry.aggregate({
      _avg: {
        phase1Score: true,
        phase2Score: true,
        phase3Score: true,
        phase4Score: true,
        phase5Score: true,
        totalScore: true,
      },
    }),
    prisma.quizEntry.count(),
    prisma.quizEntry.count({ where: { phase1Score: { gt: 0 } } }),
    prisma.quizEntry.count({ where: { phase2Score: { gt: 0 } } }),
    prisma.quizEntry.count({ where: { phase3Score: { gt: 0 } } }),
    prisma.quizEntry.count({ where: { phase4Score: { gt: 0 } } }),
    prisma.quizEntry.count({ where: { phase5Score: { gt: 0 } } }),
  ]);

  const phaseAvgScores = [
    { phase: "Phase 1\nFlash Cards", avg: Math.round((memoryAvg._avg.phase1Score ?? 0) * 10) / 10 },
    { phase: "Phase 2\nMemory Match", avg: Math.round((memoryAvg._avg.phase2Score ?? 0) * 10) / 10 },
    { phase: "Phase 3\nSequence", avg: Math.round((memoryAvg._avg.phase3Score ?? 0) * 10) / 10 },
    { phase: "Phase 4\nFill-Gap", avg: Math.round((memoryAvg._avg.phase4Score ?? 0) * 10) / 10 },
    { phase: "Phase 5\nTrue/False", avg: Math.round((memoryAvg._avg.phase5Score ?? 0) * 10) / 10 },
  ];

  const phaseDropOff = [
    { phase: "Phase 1", completed: p1, dropOffPct: totalEntries > 0 ? Math.round((1 - p1 / totalEntries) * 100) : 0 },
    { phase: "Phase 2", completed: p2, dropOffPct: p1 > 0 ? Math.round((1 - p2 / p1) * 100) : 0 },
    { phase: "Phase 3", completed: p3, dropOffPct: p2 > 0 ? Math.round((1 - p3 / p2) * 100) : 0 },
    { phase: "Phase 4", completed: p4, dropOffPct: p3 > 0 ? Math.round((1 - p4 / p3) * 100) : 0 },
    { phase: "Phase 5", completed: p5, dropOffPct: p4 > 0 ? Math.round((1 - p5 / p4) * 100) : 0 },
  ];

  const highestDropOffPhase = phaseDropOff.reduce(
    (max, p) => (p.dropOffPct > max.dropOffPct ? p : max),
    { phase: "—", completed: 0, dropOffPct: 0 }
  );

  return NextResponse.json({
    funnel: funnelSteps,
    leaderboards,
    quizDailyData,
    quizSummary,
    memory: {
      avgTotalScore: Math.round((memoryAvg._avg.totalScore ?? 0) * 10) / 10,
      phaseAvgScores,
      phaseDropOff,
      highestDropOffPhase: highestDropOffPhase.phase,
      totalEntries,
    },
  });
}
