/**
 * POST /api/cron/monthly-roi
 *
 * Must be called with  Authorization: Bearer <CRON_SECRET>
 * Schedule: once per month (e.g. Vercel Cron "0 8 1 * *").
 *
 * For each ACTIVE, non-frozen Investment:
 *   1. Inactivity freeze check — if worker had zero earnings in the last 30 days,
 *      set isFrozen = true and skip.
 *   2. Monthly ROI deduction — deduct roiPct% of worker's last-30-day earnings
 *      from worker wallet → credit to investor wallet.
 *      (Skipped if worker has insufficient balance — no forced negative.)
 *   3. Milestone release — if the next 25%-tranche release date has passed,
 *      credit worker and decrement escrowBalance.
 *   4. Maturity check — if maturityDate has passed, mark MATURED.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { creditWallet, debitWallet } from "@/lib/server/wallet";

export const dynamic = "force-dynamic";

const MILESTONE_SHARE = 0.25;
const MILESTONES      = 4;

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now          = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const investments = await prisma.investment.findMany({
    where: { status: "ACTIVE" },
    include: {
      user:   { select: { id: true, email: true, name: true } },   // investor
      worker: { select: { id: true, email: true, name: true } },   // worker
      request: { select: { id: true } },
    },
  });

  const summary = {
    processed: 0,
    frozen:    0,
    roiPaid:   0,
    milestones: 0,
    matured:   0,
    skipped:   0,
  };

  for (const inv of investments) {
    const amount    = Number(inv.amount);
    const workerId  = inv.workerId;
    const investorId = inv.userId;

    // ── 1. Inactivity freeze check ──────────────────────────────
    const recentEarnings = await prisma.transaction.aggregate({
      where: {
        userId:    workerId,
        status:    "COMPLETED",
        type:      { in: ["REFERRAL_BONUS", "BET_PAYOUT", "STORY_PURCHASE", "INVESTMENT_RETURN"] },
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
    });
    const earnedThisMonth = Number(recentEarnings._sum.amount ?? 0);

    if (earnedThisMonth === 0 && !inv.isFrozen) {
      await prisma.investment.update({
        where: { id: inv.id },
        data:  { isFrozen: true, frozenAt: now },
      });
      summary.frozen++;
      continue;
    }

    // Unfreeze if worker is active again
    if (earnedThisMonth > 0 && inv.isFrozen) {
      await prisma.investment.update({
        where: { id: inv.id },
        data:  { isFrozen: false, frozenAt: null, lastActivityAt: now },
      });
    }

    if (inv.isFrozen) { summary.skipped++; continue; }

    // ── 2. Monthly ROI deduction ────────────────────────────────
    const roiAmount = Math.round(earnedThisMonth * Number(inv.roiPct) / 100);
    const workerWallet = await prisma.wallet.findUnique({ where: { userId: workerId } });
    const workerBalance = Number(workerWallet?.balance ?? 0);

    if (roiAmount > 0 && workerBalance >= roiAmount) {
      const lastPaid = inv.lastRoiPaidAt;
      const monthSinceLastPay = !lastPaid ||
        (now.getTime() - lastPaid.getTime()) >= 28 * 24 * 60 * 60 * 1000;

      if (monthSinceLastPay) {
        const ref = `ROI-${inv.id}-${now.toISOString().slice(0, 7)}`;
        try {
          await debitWallet(
            workerId, roiAmount, "ADJUSTMENT",
            `Monthly ROI payment to investor (${Number(inv.roiPct)}% of ₦${earnedThisMonth.toLocaleString()} earnings)`,
            `${ref}-DEBIT`,
            { investmentId: inv.id, investorId, roiPct: Number(inv.roiPct) },
          );
          await creditWallet(
            investorId, roiAmount, "INVESTMENT_RETURN",
            `Monthly ROI from worker investment — ${Number(inv.roiPct)}% of ₦${earnedThisMonth.toLocaleString()}`,
            `${ref}-CREDIT`,
            { investmentId: inv.id, workerId, roiPct: Number(inv.roiPct) },
          );
          await prisma.investment.update({
            where: { id: inv.id },
            data:  {
              lastRoiPaidAt:  now,
              lastActivityAt: now,
              actualReturn:   { increment: roiAmount },
            },
          });
          summary.roiPaid++;
        } catch {
          // Worker may have had balance race; skip ROI for this month
        }
      }
    }

    // ── 3. Milestone release ────────────────────────────────────
    const totalEscrow    = amount;
    const nextMilestone  = inv.milestonesPaid + 1;

    if (nextMilestone <= MILESTONES && Number(inv.escrowBalance) > 0) {
      // Release at evenly-spaced intervals: month 0, months/4, months/2, 3*months/4
      const msInterval = inv.months / MILESTONES;
      const msDate     = new Date(inv.createdAt);
      msDate.setMonth(msDate.getMonth() + Math.round(nextMilestone * msInterval));

      if (now >= msDate) {
        const milestoneAmount = Math.round(totalEscrow * MILESTONE_SHARE);
        const actualRelease   = Math.min(milestoneAmount, Number(inv.escrowBalance));

        if (actualRelease > 0) {
          try {
            await creditWallet(
              workerId, actualRelease, "INVESTMENT_RETURN",
              `Investment milestone ${nextMilestone}/${MILESTONES} released`,
              `INV-MS-${inv.id}-${nextMilestone}`,
              { investmentId: inv.id, milestone: nextMilestone, investorId },
            );
            await prisma.investment.update({
              where: { id: inv.id },
              data:  {
                escrowBalance:  { decrement: actualRelease },
                releasedAmount: { increment: actualRelease },
                milestonesPaid: nextMilestone,
                lastActivityAt: now,
              },
            });
            summary.milestones++;
          } catch { /* non-fatal */ }
        }
      }
    }

    // ── 4. Maturity check ───────────────────────────────────────
    if (now >= inv.maturityDate) {
      await prisma.investment.update({
        where: { id: inv.id },
        data:  { status: "MATURED", maturedAt: now },
      });
      summary.matured++;
    }

    summary.processed++;
  }

  return NextResponse.json({ ...summary, runAt: now.toISOString() });
}
