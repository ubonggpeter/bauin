/**
 * POST /api/cron/process-withdrawals
 *
 * Queue processor for QUEUED WithdrawalRequests.
 * Protected by Authorization: Bearer <CRON_SECRET>.
 *
 * For each QUEUED request:
 *   1. Resolve bank code (if missing, look up via Paystack /bank)
 *   2. Create Paystack transfer recipient
 *   3. Initiate Paystack transfer
 *   4. Mark PROCESSING (or COMPLETED if instant)
 *   5. On failure: reverse wallet debit → mark FAILED → email user
 *   6. On success: mark COMPLETED → email user
 *
 * Idempotent: each request is processed only once (status guard).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { creditWallet } from "@/lib/server/wallet";
import { sendWithdrawalStatusEmail } from "@/lib/server/email";
import { push } from "@/lib/server/push";

export const dynamic = "force-dynamic";

const PAYSTACK_BASE = "https://api.paystack.co";

function paystackHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY ?? ""}`,
    "Content-Type": "application/json",
  };
}

// ── Paystack helpers ──────────────────────────────────────────────

async function lookupBankCode(bankName: string): Promise<string | null> {
  try {
    const res  = await fetch(`${PAYSTACK_BASE}/bank?currency=NGN&perPage=100`, {
      headers: paystackHeaders(), cache: "no-store",
    });
    if (!res.ok) return null;
    const body = await res.json() as { data?: { name: string; code: string }[] };
    const name = bankName.toLowerCase().trim();
    const match = (body.data ?? []).find(
      (b) => b.name.toLowerCase().includes(name) || name.includes(b.name.toLowerCase()),
    );
    return match?.code ?? null;
  } catch {
    return null;
  }
}

async function createRecipient(
  accountName:   string,
  accountNumber: string,
  bankCode:      string,
): Promise<string | null> {
  try {
    const res = await fetch(`${PAYSTACK_BASE}/transferrecipient`, {
      method:  "POST",
      headers: paystackHeaders(),
      body:    JSON.stringify({
        type:           "nuban",
        name:           accountName,
        account_number: accountNumber,
        bank_code:      bankCode,
        currency:       "NGN",
      }),
    });
    if (!res.ok) return null;
    const body = await res.json() as { data?: { recipient_code: string } };
    return body.data?.recipient_code ?? null;
  } catch {
    return null;
  }
}

async function initiateTransfer(
  amountKobo:    number,
  recipientCode: string,
  reference:     string,
  reason:        string,
): Promise<{ code: string | null; status: string }> {
  try {
    const res = await fetch(`${PAYSTACK_BASE}/transfer`, {
      method:  "POST",
      headers: paystackHeaders(),
      body:    JSON.stringify({
        source:    "balance",
        amount:    amountKobo,
        recipient: recipientCode,
        reference,
        reason,
      }),
    });
    if (!res.ok) return { code: null, status: "failed" };
    const body = await res.json() as { data?: { transfer_code: string; status: string } };
    return {
      code:   body.data?.transfer_code ?? null,
      status: body.data?.status        ?? "failed",
    };
  } catch {
    return { code: null, status: "failed" };
  }
}

// ── Route handler ─────────────────────────────────────────────────

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    return NextResponse.json({ error: "PAYSTACK_SECRET_KEY not set" }, { status: 503 });
  }

  const pending = await prisma.withdrawalRequest.findMany({
    where:   { status: "QUEUED" },
    include: {
      user:        { select: { email: true, name: true } },
      transaction: { select: { reference: true } },
    },
    orderBy: { createdAt: "asc" },
    take:    50,
  });

  if (pending.length === 0) {
    return NextResponse.json({ processed: 0, message: "No queued withdrawals" });
  }

  const results: { id: string; status: string; error?: string }[] = [];

  for (const wr of pending) {
    const amount    = Number(wr.amount);
    const reference = wr.transaction.reference ?? `WD-${wr.id}`;
    const userEmail = wr.user.email;
    const userName  = wr.user.name ?? "User";

    // ── 1. Resolve bank code ────────────────────────────────────
    let bankCode = wr.bankCode;
    if (!bankCode) {
      bankCode = await lookupBankCode(wr.bankName);
      if (bankCode) {
        await prisma.withdrawalRequest.update({
          where: { id: wr.id },
          data:  { bankCode },
        });
      }
    }

    if (!bankCode) {
      await prisma.withdrawalRequest.update({
        where: { id: wr.id },
        data:  { status: "PENDING_ADMIN", failureReason: "Could not resolve bank code — admin must process manually" },
      });
      results.push({ id: wr.id, status: "PENDING_ADMIN", error: "bank code unresolved" });
      continue;
    }

    // ── 2. Create Paystack recipient ────────────────────────────
    let recipientCode = wr.paystackRecipientCode;
    if (!recipientCode) {
      recipientCode = await createRecipient(wr.accountName, wr.accountNumber, bankCode);
    }

    if (!recipientCode) {
      await failWithdrawal(wr.id, wr.userId, wr.transactionId, amount, reference,
        "Could not create Paystack transfer recipient. Funds returned to wallet.");
      await sendWithdrawalStatusEmail(userEmail, userName, amount, "FAILED",
        "Payment gateway could not verify your account details.");
      push.withdrawalProcessed(wr.userId, amount, "FAILED").catch(() => {});
      results.push({ id: wr.id, status: "FAILED", error: "recipient creation failed" });
      continue;
    }

    // Save recipient code in case we need to retry
    await prisma.withdrawalRequest.update({
      where: { id: wr.id },
      data:  { paystackRecipientCode: recipientCode, status: "PROCESSING" },
    });
    await prisma.transaction.update({
      where: { id: wr.transactionId },
      data:  { status: "PENDING" }, // already PENDING, just for clarity
    });
    await sendWithdrawalStatusEmail(userEmail, userName, amount, "PROCESSING");

    // ── 3. Initiate transfer ────────────────────────────────────
    const paystackRef  = `PST-${reference}`;
    const transfer     = await initiateTransfer(
      amount * 100,
      recipientCode,
      paystackRef,
      `BAUIN withdrawal — ${wr.accountName}`,
    );

    if (!transfer.code || transfer.status === "failed") {
      await failWithdrawal(wr.id, wr.userId, wr.transactionId, amount, reference,
        "Paystack transfer failed. Funds returned to wallet.");
      await sendWithdrawalStatusEmail(userEmail, userName, amount, "FAILED",
        "Transfer could not be completed. Please try again.");
      push.withdrawalProcessed(wr.userId, amount, "FAILED").catch(() => {});
      results.push({ id: wr.id, status: "FAILED", error: "transfer initiation failed" });
      continue;
    }

    // ── 4. Mark completed or processing ────────────────────────
    const finalStatus = transfer.status === "success" ? "COMPLETED" : "PROCESSING";
    await prisma.withdrawalRequest.update({
      where: { id: wr.id },
      data:  {
        status:               finalStatus,
        paystackTransferCode: transfer.code,
        paystackReference:    paystackRef,
        processedAt:          new Date(),
      },
    });

    if (finalStatus === "COMPLETED") {
      await prisma.transaction.update({
        where: { id: wr.transactionId },
        data:  { status: "COMPLETED" },
      });
      await sendWithdrawalStatusEmail(userEmail, userName, amount, "COMPLETED");
      push.withdrawalProcessed(wr.userId, amount, "COMPLETED").catch(() => {});
    }

    results.push({ id: wr.id, status: finalStatus });
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}

// ── Reverse debit on failure ──────────────────────────────────────
async function failWithdrawal(
  withdrawalId:  string,
  userId:        string,
  transactionId: string,
  amount:        number,
  originalRef:   string,
  reason:        string,
) {
  await Promise.all([
    prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data:  { status: "FAILED", failureReason: reason, processedAt: new Date() },
    }),
    prisma.transaction.update({
      where: { id: transactionId },
      data:  { status: "FAILED" },
    }),
  ]);

  // Reverse the debit
  await creditWallet(
    userId,
    amount,
    "ADJUSTMENT",
    `Withdrawal reversal — ${reason}`,
    `REVERSAL-${originalRef}`,
    { withdrawalId, originalRef, reason },
  );
}
