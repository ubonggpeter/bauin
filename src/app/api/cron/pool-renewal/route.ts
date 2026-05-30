/**
 * POST /api/cron/pool-renewal
 *
 * Authorization: Bearer <CRON_SECRET>
 * Runs monthly (e.g. Vercel Cron "0 9 1 * *").
 *
 * For each ACTIVE ToolPool where nextRenewalAt <= now:
 *   1. Count ACTIVE members.
 *   2. Cost per member = monthlyCost / memberCount.
 *   3. Platform fee = TOOL_POOL_FEE_PCT% (default 5) of each member's share.
 *   4. Debit each member wallet (TOOL_POOL_FEE). On failure → suspend member.
 *   5. Credit pool owner with net collected (95%).
 *   6. Advance nextRenewalAt by one month.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { debitWallet, creditWallet } from "@/lib/server/wallet";
import { getAllSettings } from "@/lib/server/platform-settings";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now      = new Date();
  const settings = await getAllSettings();
  const feePct   = Math.max(0, Math.min(100, Number(settings["TOOL_POOL_FEE_PCT"] ?? "5")));

  // Load pools due for renewal
  const pools = await prisma.toolPool.findMany({
    where: {
      status:        "ACTIVE",
      nextRenewalAt: { lte: now },
    },
    include: {
      members: {
        where:   { status: "ACTIVE" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  const results: { poolId: string; name: string; collected: number; suspended: number }[] = [];

  for (const pool of pools) {
    const activeMembers = pool.members;
    if (activeMembers.length === 0) {
      // No members — advance renewal date and continue
      await advanceRenewal(pool.id, pool.nextRenewalAt!);
      continue;
    }

    const totalCost    = Number(pool.monthlyCost);
    const shareGross   = Math.ceil(totalCost / activeMembers.length);
    const platformFee  = Math.round(shareGross * feePct / 100);
    const shareNet     = shareGross - platformFee;

    const renewedAt  = new Date();
    const nextDueAt  = new Date(pool.nextRenewalAt!);
    nextDueAt.setMonth(nextDueAt.getMonth() + 1);

    let collected  = 0;
    let suspended  = 0;

    for (const member of activeMembers) {
      const ref = `POOL-RENEW-${pool.id.slice(-6)}-${member.userId.slice(-6)}-${now.toISOString().slice(0, 7)}`;

      try {
        await debitWallet(
          member.userId,
          shareGross,
          "TOOL_POOL_FEE",
          `Monthly renewal: "${pool.name}" (${feePct}% platform fee)`,
          ref,
          { poolId: pool.id, feePct, shareNet, platformFee },
        );

        // Update member's next due date
        await prisma.toolPoolMember.update({
          where: { id: member.id },
          data:  { lastPaidAt: renewedAt, nextDueAt },
        });

        collected += shareNet;
      } catch {
        // Insufficient balance → suspend member
        await prisma.toolPoolMember.update({
          where: { id: member.id },
          data:  { status: "SUSPENDED" },
        });
        suspended++;
      }
    }

    // Credit pool owner net of platform fee
    if (collected > 0) {
      await creditWallet(
        pool.ownerId,
        collected,
        "ADJUSTMENT",
        `Pool renewal income: "${pool.name}" — ${activeMembers.length - suspended} members`,
        `POOL-RENEW-OWNER-${pool.id.slice(-8)}-${now.toISOString().slice(0, 7)}`,
        { poolId: pool.id, memberCount: activeMembers.length, suspended, feePct },
      );
    }

    // Advance renewal date
    await advanceRenewal(pool.id, pool.nextRenewalAt!);

    results.push({ poolId: pool.id, name: pool.name, collected, suspended });
  }

  return NextResponse.json({
    runAt:     now.toISOString(),
    processed: pools.length,
    results,
  });
}

async function advanceRenewal(poolId: string, current: Date) {
  const next = new Date(current);
  next.setMonth(next.getMonth() + 1);
  await prisma.toolPool.update({
    where: { id: poolId },
    data:  { nextRenewalAt: next },
  });
}
