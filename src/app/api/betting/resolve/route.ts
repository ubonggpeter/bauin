/**
 * POST /api/betting/resolve
 *
 * Resolves all OPEN bets for a quiz session that has already ended.
 * Can be called standalone (e.g. after manual session close, or delayed cron).
 * If called by /quiz/close it has already resolved bets inside the tx —
 * this endpoint is idempotent: bets already SETTLED are skipped.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type Tx = Prisma.TransactionClient;

async function creditWallet(
  tx: Tx,
  userId: string,
  amount: number,
  description: string,
  reference: string,
  meta: Record<string, unknown>,
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
      type:          "BET_PAYOUT",
      amount,
      balanceBefore: before,
      balanceAfter:  before + amount,
      description,
      reference,
      status:        "COMPLETED",
      metadata:      meta as Prisma.InputJsonValue,
    },
  });
}

type ResolveBody = { sessionId: string };

const REQUIRED: Record<string, number> = { TOP1: 1, TOP3: 3, TOP5: 5, TOP10: 10 };
const MULTI:    Record<string, number> = { TOP1: 9, TOP3: 5, TOP5: 3, TOP10: 2  };

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const callerId = session.user.id;

  let body: ResolveBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { sessionId } = body;

  // ── Load session + entries + open bets ─────────────────────────
  const quizSession = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: {
      distributorCollection: { select: { userId: true } },
      entries: {
        where:   { completedAt: { not: null } },
        orderBy: { totalScore: "desc" },
        select:  { id: true, userId: true, totalScore: true, rank: true },
      },
      bets: {
        where: { status: "OPEN" },
      },
    },
  });

  if (!quizSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Auth: only collection owner can resolve
  if (quizSession.distributorCollection?.userId !== callerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (quizSession.status !== "ENDED") {
    return NextResponse.json({ error: "Session must be ENDED before resolving bets" }, { status: 400 });
  }

  const openBets = quizSession.bets;
  if (openBets.length === 0) {
    return NextResponse.json({ message: "No open bets to resolve", resolved: 0 });
  }

  // ── Final ranked entry IDs ─────────────────────────────────────
  const rankedEntryIds = quizSession.entries
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((e) => e.id);

  // ── Resolve ────────────────────────────────────────────────────
  const results = await prisma.$transaction(async (tx) => {
    const won: { betId: string; userId: string; payout: number }[] = [];
    const lost: string[] = [];

    for (const bet of openBets) {
      const required  = REQUIRED[bet.type] ?? 0;
      const topIds    = rankedEntryIds.slice(0, required);
      const predicted = (bet.predictedIds as string[]) ?? [];

      const isWinner = predicted.length === required
        && predicted.every((id) => topIds.includes(id));

      const payout = isWinner ? Number(bet.stake) * (MULTI[bet.type] ?? 1) : 0;

      await tx.bet.update({
        where: { id: bet.id },
        data:  { status: "SETTLED", payout, settledAt: new Date() },
      });

      if (isWinner) {
        await creditWallet(
          tx, bet.userId, payout,
          `Quiz bet won — ${bet.type} · session ${sessionId.slice(-8)}`,
          `BET-WIN-${bet.id}`,
          { sessionId, betType: bet.type, stake: Number(bet.stake), payout }
        );
        won.push({ betId: bet.id, userId: bet.userId, payout });
      } else {
        lost.push(bet.id);
      }
    }

    return { won, lost };
  });

  return NextResponse.json({
    sessionId,
    resolved:    openBets.length,
    wonCount:    results.won.length,
    lostCount:   results.lost.length,
    totalPayout: results.won.reduce((s, w) => s + w.payout, 0),
    winners:     results.won,
  });
}
