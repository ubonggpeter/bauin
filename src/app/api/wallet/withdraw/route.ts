/**
 * POST /api/wallet/withdraw
 * Records a withdrawal request (PENDING transaction).
 * Body: { amount: number, accountNumber: string, bankName: string, accountName: string }
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type WithdrawBody = {
  amount:        number;
  accountNumber: string;
  bankName:      string;
  accountName:   string;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: WithdrawBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { amount, accountNumber, bankName, accountName } = body;

  if (!amount || amount < 500) {
    return NextResponse.json({ error: "Minimum withdrawal is ₦500" }, { status: 400 });
  }
  if (!accountNumber || !bankName || !accountName) {
    return NextResponse.json({ error: "Account details are required" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw Object.assign(new Error("NO_WALLET"), { code: "NO_WALLET" });
    }

    const balance = Number(wallet.balance);
    if (balance < amount) {
      throw Object.assign(new Error("INSUFFICIENT_BALANCE"), { code: "INSUFFICIENT_BALANCE" });
    }

    const before = balance;
    await tx.wallet.update({
      where: { userId },
      data:  { balance: { decrement: amount }, totalWithdrawn: { increment: amount } },
    });

    const transaction = await tx.transaction.create({
      data: {
        walletId:      wallet.id,
        userId,
        type:          "WITHDRAWAL",
        amount,
        balanceBefore: before,
        balanceAfter:  before - amount,
        description:   `Withdrawal to ${bankName} — ${accountName}`,
        reference:     `WD-${userId.slice(-6)}-${Date.now().toString(36).toUpperCase()}`,
        status:        "PENDING",
        metadata: {
          accountNumber,
          bankName,
          accountName,
        } as Prisma.InputJsonValue,
      },
    });

    return { transactionId: transaction.id, newBalance: before - amount };
  });

  return NextResponse.json({
    ...result,
    status: "PENDING",
    message: "Withdrawal request submitted. Funds will be transferred within 1-2 business days.",
  });
}
