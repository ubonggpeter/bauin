/**
 * POST /api/investments/fund
 *
 * Investor funds an APPROVED InvestmentRequest.
 *
 * Flow:
 *   1. Verify Paystack payment for the exact request amount.
 *   2. Atomic transaction:
 *      a. Lock request (set CONVERTED) — prevents double-funding.
 *      b. Create Investment with escrowBalance = amount.
 *      c. Record an INVESTMENT_RETURN Transaction (escrow entry) on investor's wallet.
 *   3. First milestone (25%) released to worker immediately.
 *
 * Escrow model:
 *   - Investment.escrowBalance tracks unreleased principal.
 *   - Milestones (4 × 25%) are released by the monthly-roi cron or on demand.
 *   - 30-day inactivity freeze prevents further releases and ROI deductions.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { creditWallet } from "@/lib/server/wallet";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

async function verifyPaystack(reference: string, expectedNaira: number) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return { ok: true };
  try {
    const res  = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" },
    );
    if (!res.ok) return { ok: false };
    const body = await res.json() as { status: boolean; data?: { status: string; amount: number } };
    if (!body.status || body.data?.status !== "success") return { ok: false };
    return { ok: Math.abs(body.data.amount - Math.round(expectedNaira * 100)) <= 1 };
  } catch { return { ok: false }; }
}

type FundBody = { requestId: string; paystackReference: string };

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const investorId = session.user.id;

  let body: FundBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { requestId, paystackReference } = body;
  if (!requestId || !paystackReference) {
    return NextResponse.json({ error: "requestId and paystackReference are required" }, { status: 400 });
  }

  // ── Load request ──────────────────────────────────────────────
  const request = await prisma.investmentRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!request) {
    return NextResponse.json({ error: "Investment request not found" }, { status: 404 });
  }
  if (request.status !== "APPROVED") {
    return NextResponse.json({ error: "Request is not open for funding" }, { status: 409 });
  }
  if (request.userId === investorId) {
    return NextResponse.json({ error: "Cannot fund your own request" }, { status: 400 });
  }

  const amount = Number(request.amount);

  // ── Verify payment ────────────────────────────────────────────
  const { ok } = await verifyPaystack(paystackReference, amount);
  if (!ok) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 402 });
  }

  // ── Atomic: lock request + create Investment + first milestone ─
  const maturityDate = new Date();
  maturityDate.setMonth(maturityDate.getMonth() + request.months);

  const milestone25 = Math.round(amount * 0.25);
  const roiPct      = Number(request.roiPct);

  let investment: { id: string };
  try {
    investment = await prisma.$transaction(async (tx) => {
      // Double-fund guard: re-read inside tx
      const fresh = await tx.investmentRequest.findUnique({
        where: { id: requestId }, select: { status: true },
      });
      if (fresh?.status !== "APPROVED") {
        throw Object.assign(new Error("ALREADY_FUNDED"), { code: "ALREADY_FUNDED" });
      }

      // Lock the request
      await tx.investmentRequest.update({
        where: { id: requestId },
        data:  { status: "CONVERTED", reviewedAt: new Date() },
      });

      // Create Investment (escrow = 75% remaining after first milestone)
      const inv = await tx.investment.create({
        data: {
          userId:         investorId,
          workerId:       request.userId,
          requestId,
          amount,
          roiPct,
          months:         request.months,
          returnRate:     roiPct / 100,
          expectedReturn: Math.round(amount * roiPct / 100),
          escrowBalance:  amount - milestone25,  // 75% held in escrow
          releasedAmount: milestone25,
          milestonesPaid: 1,
          lastActivityAt: new Date(),
          maturityDate,
          status:         "ACTIVE",
        },
      });

      // Record escrow INVESTMENT_RETURN tx on investor (documents the outflow)
      const investorWallet = await tx.wallet.upsert({
        where:  { userId: investorId },
        create: { userId: investorId, balance: 0, totalDeposited: 0, totalWithdrawn: 0, totalEarned: 0 },
        update: {},
      });
      await tx.transaction.create({
        data: {
          walletId:      investorWallet.id,
          userId:        investorId,
          type:          "INVESTMENT_RETURN",
          amount:        0,  // outflow tracked in Investment.amount
          balanceBefore: Number(investorWallet.balance),
          balanceAfter:  Number(investorWallet.balance),
          description:   `Investment funded: ${request.user.name} — ₦${amount.toLocaleString()} @ ${roiPct}% ROI (${request.months} months)`,
          reference:     `INV-FUND-${inv.id}`,
          status:        "COMPLETED",
          metadata: { investmentId: inv.id, workerId: request.userId, amount, roiPct } as Prisma.InputJsonValue,
        },
      });

      return inv;
    });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "ALREADY_FUNDED") {
      return NextResponse.json({ error: "This request was already funded" }, { status: 409 });
    }
    throw err;
  }

  // ── Release first 25% milestone to worker (outside tx) ────────
  await creditWallet(
    request.userId,
    milestone25,
    "INVESTMENT_RETURN",
    `Investment milestone 1/4 released — funded by investor`,
    `INV-MS-${investment.id}-1`,
    { investmentId: investment.id, milestone: 1, totalAmount: amount },
  );

  return NextResponse.json({
    investmentId:  investment.id,
    workerId:      request.userId,
    workerName:    request.user.name,
    amount,
    roiPct,
    months:        request.months,
    escrowBalance: amount - milestone25,
    milestone1Released: milestone25,
    maturityDate:  maturityDate.toISOString(),
    message:       `Investment confirmed. First ₦${milestone25.toLocaleString()} released to worker immediately.`,
  }, { status: 201 });
}
