/**
 * Shared wallet helpers — each creates its own DB transaction.
 * For use inside an existing Prisma transaction use the Tx-variants in referral-earnings.ts.
 */
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type CreditType = "REFERRAL_BONUS" | "BET_PAYOUT" | "DEPOSIT" | "ADJUSTMENT" | "INVESTMENT_RETURN" | "STORY_PURCHASE" | "ACHIEVEMENT_BONUS" | "LEADERBOARD_PRIZE" | "JOB_PAYMENT" | "AFFILIATE_BONUS" | "MILESTONE_BONUS";
type DebitType  = "WITHDRAWAL" | "BET_STAKE" | "CATEGORY_REGISTRATION" | "CATEGORY_MONTHLY_FEE" | "CATEGORY_RETRY_FEE" | "TOOL_POOL_FEE" | "ADJUSTMENT" | "JOB_ESCROW" | "STORY_PURCHASE" | "BUNDLE_PURCHASE";

function makeRef(prefix: string, userId: string): string {
  return `${prefix}-${userId.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

// ── Credit ────────────────────────────────────────────────────────
export async function creditWallet(
  userId:      string,
  amount:      number,
  type:        CreditType,
  description: string,
  reference:   string,
  metadata?:   Record<string, unknown>,
): Promise<{ transactionId: string; balanceAfter: number }> {
  if (amount <= 0) throw new Error("credit amount must be positive");

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where:  { userId },
      create: { userId, balance: 0, totalDeposited: 0, totalWithdrawn: 0, totalEarned: 0 },
      update: {},
    });

    const before = Number(wallet.balance);
    const after  = before + amount;

    await tx.wallet.update({
      where: { userId },
      data:  { balance: { increment: amount }, totalEarned: { increment: amount } },
    });

    const tx_ = await tx.transaction.create({
      data: {
        walletId:      wallet.id,
        userId,
        type,
        amount,
        balanceBefore: before,
        balanceAfter:  after,
        description,
        reference,
        status:        "COMPLETED",
        metadata:      (metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    return { transactionId: tx_.id, balanceAfter: after };
  });
}

// ── Debit ─────────────────────────────────────────────────────────
export async function debitWallet(
  userId:      string,
  amount:      number,
  type:        DebitType,
  description: string,
  reference:   string,
  metadata?:   Record<string, unknown>,
): Promise<{ transactionId: string; balanceAfter: number; walletId: string }> {
  if (amount <= 0) throw new Error("debit amount must be positive");

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw Object.assign(new Error("Wallet not found"), { code: "NO_WALLET" });
    }

    const before = Number(wallet.balance);
    if (before < amount) {
      throw Object.assign(
        new Error(`Insufficient balance: have ₦${before.toLocaleString()}, need ₦${amount.toLocaleString()}`),
        { code: "INSUFFICIENT_BALANCE" },
      );
    }

    const after = before - amount;

    await tx.wallet.update({
      where: { userId },
      data:  {
        balance:        { decrement: amount },
        totalWithdrawn: type === "WITHDRAWAL" ? { increment: amount } : undefined,
      },
    });

    const tx_ = await tx.transaction.create({
      data: {
        walletId:      wallet.id,
        userId,
        type,
        amount,
        balanceBefore: before,
        balanceAfter:  after,
        description,
        reference,
        status:        "COMPLETED",
        metadata:      (metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    return { transactionId: tx_.id, balanceAfter: after, walletId: wallet.id };
  });
}

export { makeRef };
