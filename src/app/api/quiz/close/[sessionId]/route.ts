/**
 * POST /api/quiz/close/[sessionId]
 *
 * distributeQuizRevenue:
 *   Entry-fee pool split:
 *     Distributor  50%  → collection owner wallet  (REFERRAL_BONUS)
 *     Platform     30%  → recorded in metadata only (no wallet)
 *     Royalty      10%  → story author wallet if episode linked  (REFERRAL_BONUS)
 *     Winners       5%  → top-3 split 60/25/15  (BET_PAYOUT)
 *     Viewer refs   5%  → split among VIEWER referrers  (REFERRAL_BONUS)
 *
 * Also resolves all open bets (see betting/resolve for standalone use).
 * Must be called by the collection owner or an admin.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAllSettings } from "@/lib/server/platform-settings";
import { invalidateCachedSession, invalidateCachedLeaderboard } from "@/lib/server/quiz-cache";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type Tx = Prisma.TransactionClient;

// ── Wallet credit helper (inside tx) ─────────────────────────────
async function creditWallet(
  tx: Tx,
  userId: string,
  amount: number,
  type: "REFERRAL_BONUS" | "BET_PAYOUT",
  description: string,
  reference: string,
  meta?: Record<string, unknown>,
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
      metadata:      (meta ?? {}) as Prisma.InputJsonValue,
    },
  });
}

// ── Bet resolution helper (also used by /api/betting/resolve) ─────
export async function resolveBetsForSession(
  tx: Tx,
  sessionId: string,
  rankedEntryIds: string[], // entry IDs in finish order (index 0 = 1st)
) {
  const bets = await tx.bet.findMany({
    where: { quizSessionId: sessionId, status: "OPEN" },
  });

  const REQUIRED_PICKS: Record<string, number> = { TOP1: 1, TOP3: 3, TOP5: 5, TOP10: 10 };
  const MULTIPLIERS:    Record<string, number> = { TOP1: 9, TOP3: 5, TOP5: 3, TOP10: 2 };

  const payouts: { userId: string; amount: number; reference: string }[] = [];

  for (const bet of bets) {
    const required = REQUIRED_PICKS[bet.type] ?? 0;
    const topIds   = rankedEntryIds.slice(0, required);
    const predicted = (bet.predictedIds as string[]) ?? [];

    // Winner = all predicted IDs appear within the top N finishers
    const isWinner = predicted.length === required && predicted.every((id) => topIds.includes(id));

    const payout = isWinner ? Number(bet.stake) * (MULTIPLIERS[bet.type] ?? 1) : 0;

    await tx.bet.update({
      where: { id: bet.id },
      data:  { status: "SETTLED", payout, settledAt: new Date() },
    });

    if (isWinner) {
      payouts.push({ userId: bet.userId, amount: payout, reference: `BET-WIN-${bet.id}` });
    }
  }

  return payouts;
}

// ── Route handler ─────────────────────────────────────────────────
export async function POST(
  _req: Request,
  { params }: { params: { sessionId: string } }
) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const callerId = authSession.user.id;
  const { sessionId } = params;

  // ── Load session ──────────────────────────────────────────────
  const quizSession = await prisma.quizSession.findUnique({
    where:   { id: sessionId },
    include: {
      distributorCollection: {
        include: { user: { select: { id: true, name: true } } },
      },
      entries: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { totalScore: "desc" },
      },
      bets: { where: { status: "OPEN" } },
    },
  });

  if (!quizSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (quizSession.status === "ENDED") {
    return NextResponse.json({ error: "Session already closed" }, { status: 409 });
  }

  // ── Auth: caller must be collection owner ─────────────────────
  const ownerId = quizSession.distributorCollection?.userId;
  if (ownerId !== callerId) {
    return NextResponse.json({ error: "Forbidden — only the collection owner can close a session" }, { status: 403 });
  }

  // ── Revenue calculations ──────────────────────────────────────
  const settings    = await getAllSettings();
  const entryFee    = Math.max(0, Number(settings["QUIZ_ENTRY_FEE"]         ?? "500"));
  const royaltyPct  = Math.max(0, Math.min(100, Number(settings["STORY_ROYALTY_PCT_DEFAULT"] ?? "10")));

  const playerCount    = quizSession.entries.length;
  const entryPool      = playerCount * entryFee;

  const DISTRIBUTOR_PCT  = 50;
  const PLATFORM_PCT     = 30;
  const WINNER_PCT       = 5;
  const VIEWER_REF_PCT   = 5;
  // royaltyPct should sum with the rest to 100; clamp so we don't go over
  const actualRoyaltyPct = Math.min(royaltyPct, 100 - DISTRIBUTOR_PCT - PLATFORM_PCT - WINNER_PCT - VIEWER_REF_PCT);

  const distributorCut = Math.round(entryPool * DISTRIBUTOR_PCT  / 100);
  const platformCut    = Math.round(entryPool * PLATFORM_PCT     / 100); // not credited to any wallet
  const royaltyCut     = Math.round(entryPool * actualRoyaltyPct / 100);
  const winnerPool     = Math.round(entryPool * WINNER_PCT        / 100);
  const viewerRefPool  = entryPool - distributorCut - platformCut - royaltyCut - winnerPool;

  // ── Ranked entries ────────────────────────────────────────────
  const rankedEntries = [...quizSession.entries].sort((a, b) => b.totalScore - a.totalScore);
  const rankedEntryIds = rankedEntries.map((e) => e.id);

  // ── Find story author for royalty ─────────────────────────────
  let storyAuthorId: string | null = null;
  if (quizSession.episodeId) {
    const episode = await prisma.episode.findUnique({
      where:   { id: quizSession.episodeId },
      include: { story: { select: { authorId: true } } },
    });
    storyAuthorId = episode?.story?.authorId ?? null;
  }

  // ── Find viewer referrers for entries ─────────────────────────
  const entryUserIds = quizSession.entries.map((e) => e.userId);
  const viewerReferrals = entryUserIds.length
    ? await prisma.referral.findMany({
        where: { referredId: { in: entryUserIds }, type: "VIEWER" },
        select: { referrerId: true, recruitsCount: true },
      })
    : [];

  // Group by referrerId, sum recruitsCount
  const refMap = new Map<string, number>();
  for (const r of viewerReferrals) {
    refMap.set(r.referrerId, (refMap.get(r.referrerId) ?? 0) + r.recruitsCount);
  }
  const totalRecruitsCount = Array.from(refMap.values()).reduce((a, b) => a + b, 0);

  // ── Winner prizes (top 3: 60 / 25 / 15 of winnerPool) ────────
  const winnerShares = [0.60, 0.25, 0.15];

  // ── Atomic distribution ───────────────────────────────────────
  const summary = await prisma.$transaction(async (tx) => {
    // Mark session ENDED
    await tx.quizSession.update({
      where: { id: sessionId },
      data:  { status: "ENDED", endedAt: new Date() },
    });

    // Update ranks
    for (let i = 0; i < rankedEntries.length; i++) {
      await tx.quizEntry.update({
        where: { id: rankedEntries[i].id },
        data:  { rank: i + 1 },
      });
    }

    // 1. Distributor cut (50%)
    if (distributorCut > 0 && ownerId) {
      await creditWallet(tx, ownerId, distributorCut, "REFERRAL_BONUS",
        `Quiz host share (${DISTRIBUTOR_PCT}%): "${quizSession.distributorCollection?.name}"`,
        `QUIZ-DIST-${sessionId}`,
        { sessionId, playerCount, entryPool, pct: DISTRIBUTOR_PCT }
      );
    }

    // 2. Royalty (story author)
    if (royaltyCut > 0 && storyAuthorId) {
      await creditWallet(tx, storyAuthorId, royaltyCut, "REFERRAL_BONUS",
        `Story royalty from quiz session (${actualRoyaltyPct}%)`,
        `QUIZ-ROYALTY-${sessionId}`,
        { sessionId, episodeId: quizSession.episodeId, pct: actualRoyaltyPct }
      );
    }

    // 3. Winner prizes (top 3)
    const winnerCredits: { userId: string; amount: number; rank: number }[] = [];
    for (let i = 0; i < Math.min(3, rankedEntries.length); i++) {
      const prize = Math.round(winnerPool * winnerShares[i]);
      if (prize > 0) {
        await creditWallet(tx, rankedEntries[i].userId, prize, "BET_PAYOUT",
          `Quiz winner prize — Rank ${i + 1} of ${playerCount} players`,
          `QUIZ-WIN-${sessionId}-${i + 1}`,
          { sessionId, rank: i + 1, totalScore: rankedEntries[i].totalScore }
        );
        winnerCredits.push({ userId: rankedEntries[i].userId, amount: prize, rank: i + 1 });
      }
    }

    // 4. Viewer referral earnings (split proportionally)
    const viewerRefCredits: { userId: string; amount: number }[] = [];
    if (viewerRefPool > 0 && refMap.size > 0 && totalRecruitsCount > 0) {
      for (const [referrerId, recruits] of Array.from(refMap.entries())) {
        const share = Math.round(viewerRefPool * (recruits / totalRecruitsCount));
        if (share > 0) {
          await creditWallet(tx, referrerId, share, "REFERRAL_BONUS",
            `Viewer referral earnings — ${recruits} recruit${recruits !== 1 ? "s" : ""}`,
            `QUIZ-VIEWREF-${sessionId}-${referrerId.slice(-8)}`,
            { sessionId, recruits, totalRecruitsCount }
          );
          viewerRefCredits.push({ userId: referrerId, amount: share });
        }
      }
    }

    // 5. Resolve open bets
    const betPayouts = await resolveBetsForSession(tx, sessionId, rankedEntryIds);
    for (const p of betPayouts) {
      await creditWallet(tx, p.userId, p.amount, "BET_PAYOUT",
        `Quiz bet payout`,
        p.reference,
        { sessionId }
      );
    }

    return {
      playerCount,
      entryPool,
      distributorCut,
      platformCut,
      royaltyCut,
      winnerPool,
      viewerRefPool,
      winnerCredits,
      viewerRefCredits,
      betPayoutsCount: betPayouts.length,
      totalBetPayouts: betPayouts.reduce((s, p) => s + p.amount, 0),
    };
  });

  // ── Invalidate caches ─────────────────────────────────────────
  await invalidateCachedSession(quizSession.distributorCollection?.publicLinkCode ?? "");
  await invalidateCachedLeaderboard(sessionId);

  return NextResponse.json({
    sessionId,
    status:  "ENDED",
    summary: {
      ...summary,
      distribution: {
        distributor:   { pct: DISTRIBUTOR_PCT,    amount: summary.distributorCut },
        platform:      { pct: PLATFORM_PCT,       amount: summary.platformCut    },
        royalty:       { pct: actualRoyaltyPct,   amount: summary.royaltyCut     },
        winners:       { pct: WINNER_PCT,         amount: summary.winnerPool     },
        viewerRefs:    { pct: VIEWER_REF_PCT,      amount: summary.viewerRefPool  },
      },
    },
  });
}
