/**
 * Referral earnings helpers — all percentages from PlatformSettings, never hardcoded.
 *
 * WORKER referral:
 *   onPaymentReferralCredit  — called when a referred user makes a payment; credits REFERRAL_WORKER_PAYMENT_PCT% (default 50)
 *   daily cron               — credits REFERRAL_WORKER_DAILY_PCT% (default 10) of yesterday's referee spending
 *   Bonus expires after      REFERRAL_WORKER_EXPIRY_MONTHS months (default 6)
 *
 * VIEWER referral:
 *   onViewerQuizEntry        — increments recruitsCount, creates LOCKED earning at REFERRAL_VIEWER_PCT% (default 30)
 *   unlockViewerEarnings     — called when recruitsCount >= unlockThreshold; credits wallet + email
 */
import type { Prisma } from "@prisma/client";
import { sendReferralUnlockedEmail } from "@/lib/server/email";

type Tx = Prisma.TransactionClient;
type Settings = Record<string, string>;

// ── Wallet credit (shared) ────────────────────────────────────────
export async function creditWallet(
  tx: Tx,
  userId: string,
  amount: number,
  type: "REFERRAL_BONUS" | "BET_PAYOUT",
  description: string,
  reference: string,
  metadata?: Record<string, unknown>,
) {
  if (amount <= 0) return;

  const wallet = await tx.wallet.upsert({
    where:  { userId },
    create: { userId, balance: 0, totalDeposited: 0, totalWithdrawn: 0, totalEarned: 0 },
    update: {},
  });

  const before = Number(wallet.balance);
  await tx.wallet.update({
    where: { userId },
    data:  { balance: { increment: amount }, totalEarned: { increment: amount } },
  });

  await tx.transaction.create({
    data: {
      walletId:      wallet.id,
      userId,
      type,
      amount,
      balanceBefore: before,
      balanceAfter:  before + amount,
      description,
      reference,
      status:        "COMPLETED",
      metadata:      (metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

// ── WORKER: on payment ────────────────────────────────────────────
/**
 * Called inside an existing tx immediately after a successful payment by referredUserId.
 * Finds the WORKER Referral, checks expiry, credits REFERRAL_WORKER_PAYMENT_PCT% to referrer,
 * and creates a ReferralEarning record.
 */
export async function onPaymentReferralCredit(
  tx: Tx,
  referredUserId: string,
  amountPaid: number,
  paymentRef: string,
  source: string,
  settings: Settings,
) {
  if (amountPaid <= 0) return;

  const paymentPct      = Math.max(0, Math.min(100, Number(settings["REFERRAL_WORKER_PAYMENT_PCT"]  ?? "50")));
  const expiryMonths    = Math.max(1,               Number(settings["REFERRAL_WORKER_EXPIRY_MONTHS"] ?? "6"));

  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() - expiryMonths);

  // Find WORKER referral where this user was referred, created within the expiry window
  const referral = await tx.referral.findFirst({
    where: {
      referredId: referredUserId,
      type:       "WORKER",
      createdAt:  { gte: expiryDate },
    },
  });
  if (!referral) return;

  const bonus = Math.round(amountPaid * paymentPct / 100);
  if (bonus <= 0) return;

  await creditWallet(
    tx,
    referral.referrerId,
    bonus,
    "REFERRAL_BONUS",
    `Worker referral bonus (${paymentPct}%) on payment ref ${paymentRef}`,
    `REF-PAY-${referral.id}-${paymentRef.slice(-8)}`,
    { referralId: referral.id, referredUserId, amountPaid, paymentPct, source },
  );

  await tx.referralEarning.create({
    data: {
      referralId:  referral.id,
      amount:      bonus,
      source:      "WORKER_PAYMENT",
      description: `${paymentPct}% of ₦${amountPaid.toLocaleString()} — ${source}`,
    },
  });
}

// ── VIEWER: on quiz entry ─────────────────────────────────────────
/**
 * Called inside an existing tx when a viewer enters a quiz through a referral link.
 * Upserts the VIEWER Referral, creates a LOCKED earning, and unlocks if threshold reached.
 */
export async function onViewerQuizEntry(
  tx: Tx,
  viewerReferrerId: string,
  referredUserId: string,
  entryFee: number,
  sessionId: string,
  settings: Settings,
) {
  if (viewerReferrerId === referredUserId) return;

  const viewerPct       = Math.max(0, Math.min(100, Number(settings["REFERRAL_VIEWER_PCT"]              ?? "30")));
  const unlockThreshold = Math.max(1,               Number(settings["REFERRAL_VIEWER_UNLOCK_THRESHOLD"]  ?? "5"));

  // Upsert referral record
  const referral = await tx.referral.upsert({
    where:  { referrerId_referredId: { referrerId: viewerReferrerId, referredId: referredUserId } },
    create: {
      referrerId:      viewerReferrerId,
      referredId:      referredUserId,
      type:            "VIEWER",
      recruitsCount:   1,
      unlockThreshold,
    },
    update: { recruitsCount: { increment: 1 } },
  });

  // LOCKED earning (30% of entry fee, remains locked until threshold)
  const lockedBonus = Math.round(entryFee * viewerPct / 100);
  if (lockedBonus > 0) {
    await tx.referralEarning.create({
      data: {
        referralId:  referral.id,
        amount:      lockedBonus,
        source:      "VIEWER_QUIZ_LOCKED",
        description: `${viewerPct}% of quiz entry (sessionId:${sessionId.slice(-8)}) — LOCKED`,
      },
    });
  }

  // Re-fetch to get updated recruitsCount
  const updated = await tx.referral.findUnique({ where: { id: referral.id } });
  if (updated && updated.recruitsCount >= updated.unlockThreshold && !updated.earningsUnlocked) {
    await unlockViewerEarnings(tx, updated);
  }
}

// ── VIEWER: unlock ────────────────────────────────────────────────
export async function unlockViewerEarnings(
  tx: Tx,
  referral: { id: string; referrerId: string; recruitsCount: number },
) {
  // Sum all LOCKED earnings for this referral
  const lockedEarnings = await tx.referralEarning.findMany({
    where: { referralId: referral.id, source: "VIEWER_QUIZ_LOCKED" },
  });

  const total = lockedEarnings.reduce((sum, e) => sum + Number(e.amount), 0);

  if (total > 0) {
    await creditWallet(
      tx,
      referral.referrerId,
      total,
      "REFERRAL_BONUS",
      `Viewer referral unlocked — ${referral.recruitsCount} recruits`,
      `VIEWER-UNLOCK-${referral.id}`,
      { referralId: referral.id, recruitsCount: referral.recruitsCount },
    );

    // Reclassify locked → unlocked
    await tx.referralEarning.updateMany({
      where: { referralId: referral.id, source: "VIEWER_QUIZ_LOCKED" },
      data:  { source: "VIEWER_QUIZ_UNLOCKED" },
    });
  }

  await tx.referral.update({
    where: { id: referral.id },
    data:  { earningsUnlocked: true },
  });

  // Fire email (non-critical — outside tx is fine but we do it after commit in caller)
  const referrerUser = await tx.user.findUnique({
    where:  { id: referral.referrerId },
    select: { email: true, name: true },
  });
  if (referrerUser?.email) {
    // Schedule email after the tx resolves (fire-and-forget via setImmediate)
    setImmediate(() => {
      sendReferralUnlockedEmail(
        referrerUser.email!,
        referrerUser.name ?? "User",
        total,
      ).catch(() => {});
    });
  }
}
