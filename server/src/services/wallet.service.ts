import type { TransactionType, TransactionStatus } from "@prisma/client";
import { prisma } from "../utils/prisma";

interface CreditParams {
  userId: string;
  amountNaira: number;
  type: TransactionType;
  description: string;
  reference?: string;
  status?: TransactionStatus;
  metadata?: Record<string, string | number | boolean | null>;
}

/**
 * Atomically credit a user's Wallet and sync the denormalized User.walletBalance.
 * Creates a completed Transaction ledger entry.
 */
export async function creditWallet(params: CreditParams): Promise<void> {
  const wallet = await prisma.wallet.findUnique({ where: { userId: params.userId } });
  if (!wallet) throw new Error(`No wallet for user ${params.userId}`);

  const before = Number(wallet.balance);
  const after = before + params.amountNaira;

  await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: after,
        totalEarned: { increment: params.amountNaira },
      },
    }),
    prisma.user.update({
      where: { id: params.userId },
      data: { walletBalance: after },
    }),
    prisma.transaction.create({
      data: {
        walletId: wallet.id,
        userId: params.userId,
        type: params.type,
        amount: params.amountNaira,
        balanceBefore: before,
        balanceAfter: after,
        description: params.description,
        reference: params.reference,
        status: params.status ?? "COMPLETED",
        metadata: params.metadata,
      },
    }),
  ]);
}

/**
 * Log an inbound Paystack payment as a DEPOSIT transaction (no balance change —
 * the money came from Paystack, not from the wallet).
 */
export async function recordExternalPayment(params: {
  userId: string;
  amountNaira: number;
  type: TransactionType;
  description: string;
  reference: string;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const wallet = await prisma.wallet.findUnique({ where: { userId: params.userId } });
  if (!wallet) return;

  const balance = Number(wallet.balance);

  await prisma.transaction.create({
    data: {
      walletId: wallet.id,
      userId: params.userId,
      type: params.type,
      amount: params.amountNaira,
      balanceBefore: balance,
      balanceAfter: balance,
      description: params.description,
      reference: params.reference,
      status: "COMPLETED",
      metadata: params.metadata,
    },
  });
}
