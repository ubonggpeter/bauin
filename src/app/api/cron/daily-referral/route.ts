/**
 * POST /api/cron/daily-referral
 *
 * Must be called with header  Authorization: Bearer <CRON_SECRET>
 * (set CRON_SECRET in environment; schedule via Vercel Cron or external cron).
 *
 * For each non-expired WORKER Referral:
 *   1. Sum StoryPurchase.amountPaid made by the referredUser in the last 24h.
 *   2. Credit REFERRAL_WORKER_DAILY_PCT% (default 10) to the referrer's wallet.
 *   3. Create ReferralEarning source="WORKER_DAILY".
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAllSettings } from "@/lib/server/platform-settings";
import { creditWallet } from "@/lib/server/referral-earnings";
import { alertAdmin } from "@/lib/server/cron-runner";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // ── Auth ───────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
  const settings         = await getAllSettings();
  const dailyPct         = Math.max(0, Math.min(100, Number(settings["REFERRAL_WORKER_DAILY_PCT"]    ?? "10")));
  const expiryMonths     = Math.max(1,               Number(settings["REFERRAL_WORKER_EXPIRY_MONTHS"] ?? "6"));

  const now        = new Date();
  const yesterday  = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() - expiryMonths);

  // Load all active (non-expired) WORKER referrals
  const referrals = await prisma.referral.findMany({
    where: {
      type:      "WORKER",
      createdAt: { gte: expiryDate },
    },
    select: { id: true, referrerId: true, referredId: true },
  });

  if (referrals.length === 0) {
    return NextResponse.json({ processed: 0, skipped: 0 });
  }

  let processed = 0;
  let skipped   = 0;

  for (const referral of referrals) {
    // Sum purchases by referredId in last 24h
    const purchases = await prisma.storyPurchase.findMany({
      where: {
        userId:      referral.referredId,
        purchasedAt: { gte: yesterday, lt: now },
      },
      select: { id: true, amountPaid: true },
    });

    const totalSpent = purchases.reduce((s, p) => s + Number(p.amountPaid), 0);
    if (totalSpent <= 0) {
      skipped++;
      continue;
    }

    const bonus = Math.round(totalSpent * dailyPct / 100);
    if (bonus <= 0) {
      skipped++;
      continue;
    }

    const purchaseIds = purchases.map((p) => p.id).join(",");

    await prisma.$transaction(async (tx) => {
      await creditWallet(
        tx,
        referral.referrerId,
        bonus,
        "REFERRAL_BONUS",
        `Daily referral bonus (${dailyPct}%) on ₦${totalSpent.toLocaleString()} referee spend`,
        `REF-DAILY-${referral.id}-${yesterday.toISOString().slice(0, 10)}`,
        {
          referralId:    referral.id,
          referredId:    referral.referredId,
          totalSpent,
          dailyPct,
          purchaseIds,
        },
      );

      await tx.referralEarning.create({
        data: {
          referralId:  referral.id,
          amount:      bonus,
          source:      "WORKER_DAILY",
          description: `${dailyPct}% of ₦${totalSpent.toLocaleString()} spent on ${yesterday.toISOString().slice(0, 10)}`,
        },
      });
    });

    processed++;
  }

  return NextResponse.json({
    date:      yesterday.toISOString().slice(0, 10),
    processed,
    skipped,
    total:     referrals.length,
  });
  } catch (err) {
    alertAdmin("daily-referral", err).catch(() => {});
    return NextResponse.json({ error: "Job failed" }, { status: 500 });
  }
}
