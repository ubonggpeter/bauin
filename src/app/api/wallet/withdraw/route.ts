/**
 * POST /api/wallet/withdraw
 *
 * 1. Validate amount against WITHDRAWAL_MIN/MAX_AMOUNT from PlatformSettings
 * 2. Validate day-of-week restriction (WITHDRAWAL_ALLOWED_DAYS, e.g. "1,2,3,4,5")
 * 3. Validate daily request limit (WITHDRAWAL_MAX_PER_DAY)
 * 4. Atomically debit wallet + create WITHDRAWAL Transaction + create WithdrawalRequest
 * 5. checkAutoApproval('WITHDRAWAL') → QUEUED (auto) or PENDING_ADMIN (manual)
 * 6. logApprovalDecision
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAllSettings } from "@/lib/server/platform-settings";
import { checkAutoApproval, logApprovalDecision } from "@/lib/server/auto-approval";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type WithdrawBody = {
  amount:        number;
  accountNumber: string;
  bankName:      string;
  accountName:   string;
  bankCode?:     string;
};

function makeRef(userId: string): string {
  return `WD-${userId.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: WithdrawBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { amount, accountNumber, bankName, accountName, bankCode } = body;

  if (!accountNumber?.trim() || !bankName?.trim() || !accountName?.trim()) {
    return NextResponse.json({ error: "Account details are required" }, { status: 400 });
  }

  // ── PlatformSettings ──────────────────────────────────────────
  const settings    = await getAllSettings();

  if (settings["SYSTEM_PAUSE_WITHDRAWALS"] === "1") {
    return NextResponse.json(
      { error: "Withdrawals are temporarily paused. Please check back shortly." },
      { status: 503 },
    );
  }

  const minAmount   = Math.max(0,   Number(settings["WITHDRAWAL_MIN_AMOUNT"]   ?? "500"));
  const maxAmount   = Math.max(100, Number(settings["WITHDRAWAL_MAX_AMOUNT"]   ?? "500000"));
  const allowedDays = (settings["WITHDRAWAL_ALLOWED_DAYS"] ?? "").trim(); // e.g. "1,2,3,4,5"
  const maxPerDay   = Math.max(1,   Number(settings["WITHDRAWAL_MAX_PER_DAY"]  ?? "3"));

  // ── Amount validation ─────────────────────────────────────────
  if (!amount || amount < minAmount) {
    return NextResponse.json({ error: `Minimum withdrawal is ₦${minAmount.toLocaleString()}` }, { status: 400 });
  }
  if (amount > maxAmount) {
    return NextResponse.json({ error: `Maximum withdrawal is ₦${maxAmount.toLocaleString()}` }, { status: 400 });
  }

  // ── Day-of-week restriction ───────────────────────────────────
  if (allowedDays) {
    const permitted = allowedDays.split(",").map((d) => d.trim());
    const today     = new Date().getDay().toString(); // 0=Sun … 6=Sat
    if (!permitted.includes(today)) {
      const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      const days     = permitted.map((d) => dayNames[Number(d)] ?? d).join(", ");
      return NextResponse.json(
        { error: `Withdrawals are only processed on: ${days}` },
        { status: 400 },
      );
    }
  }

  // ── Daily limit check ─────────────────────────────────────────
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const todayCount = await prisma.withdrawalRequest.count({
    where: { userId, createdAt: { gte: dayStart }, status: { not: "CANCELLED" } },
  });
  if (todayCount >= maxPerDay) {
    return NextResponse.json(
      { error: `Daily withdrawal limit of ${maxPerDay} reached. Try again tomorrow.` },
      { status: 429 },
    );
  }

  // ── Atomic: debit wallet + create Transaction + create WithdrawalRequest ──
  const reference = makeRef(userId);

  let withdrawalId: string;
  let newBalance:   number;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Balance check
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw Object.assign(new Error("NO_WALLET"), { code: "NO_WALLET" });
      const balance = Number(wallet.balance);
      if (balance < amount) {
        throw Object.assign(
          new Error(`Insufficient balance: ₦${balance.toLocaleString()} available`),
          { code: "INSUFFICIENT_BALANCE" },
        );
      }

      const before = balance;
      const after  = before - amount;

      // Debit wallet
      await tx.wallet.update({
        where: { userId },
        data:  { balance: { decrement: amount }, totalWithdrawn: { increment: amount } },
      });

      // Withdrawal Transaction record (PENDING until processed by Paystack)
      const transaction = await tx.transaction.create({
        data: {
          walletId:      wallet.id,
          userId,
          type:          "WITHDRAWAL",
          amount,
          balanceBefore: before,
          balanceAfter:  after,
          description:   `Withdrawal to ${bankName} — ${accountName}`,
          reference,
          status:        "PENDING",
          metadata: {
            accountNumber, bankName, accountName, bankCode: bankCode ?? null,
          } as Prisma.InputJsonValue,
        },
      });

      // WithdrawalRequest (status resolved after auto-approval check below)
      const wr = await tx.withdrawalRequest.create({
        data: {
          userId,
          transactionId: transaction.id,
          amount,
          accountNumber,
          bankName,
          accountName,
          bankCode:   bankCode ?? null,
          status:     "QUEUED",      // updated below after tx
          autoApproved: false,
        },
      });

      return { transactionId: transaction.id, withdrawalId: wr.id, newBalance: after };
    });

    withdrawalId = result.withdrawalId;
    newBalance   = result.newBalance;
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "NO_WALLET")            return NextResponse.json({ error: "Wallet not found" }, { status: 400 });
    if (code === "INSUFFICIENT_BALANCE") return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    throw err;
  }

  // ── Auto-approval check (outside tx) ─────────────────────────
  const approval = await checkAutoApproval("WITHDRAWAL", userId, {
    amount, accountNumber, bankName, accountName,
  });

  const finalStatus = approval.approved ? "QUEUED" : "PENDING_ADMIN";
  await prisma.withdrawalRequest.update({
    where: { id: withdrawalId },
    data:  { status: finalStatus, autoApproved: approval.approved },
  });

  await logApprovalDecision(approval, userId, "WITHDRAWAL", { amount, bankName });

  return NextResponse.json({
    withdrawalId,
    reference,
    amount,
    newBalance,
    status:      finalStatus,
    autoApproved: approval.approved,
    message: approval.approved
      ? "Withdrawal queued for processing. Funds will be transferred shortly."
      : "Withdrawal submitted for admin review. Processing within 1-2 business days.",
  });
}
