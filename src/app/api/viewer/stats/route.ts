/**
 * GET /api/viewer/stats
 * Viewer dashboard data: quiz history, referral progress, wallet, bets.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const REFERRAL_GOAL = 30;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const [quizEntries, referrals, wallet, bets] = await Promise.all([
    // Last 20 quiz plays
    prisma.quizEntry.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      take:    20,
      include: {
        quizSession: {
          select: { id: true, title: true, status: true },
        },
      },
    }),

    // Referral count (all referrals where this user is the referrer)
    prisma.referral.count({
      where: { referrerId: userId },
    }),

    // Wallet
    prisma.wallet.findUnique({
      where:  { userId },
      select: { balance: true, totalEarned: true, totalWithdrawn: true },
    }),

    // Last 20 bets
    prisma.bet.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      take:    20,
      include: {
        quizSession: { select: { id: true, title: true, status: true } },
      },
    }),
  ]);

  // Recent wallet transactions
  const transactions = await prisma.transaction.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    take:    15,
    select:  { id: true, type: true, amount: true, description: true, status: true, createdAt: true },
  });

  return NextResponse.json({
    quizHistory: quizEntries,
    referralCount: referrals,
    referralGoal:  REFERRAL_GOAL,
    wallet: wallet ?? { balance: 0, totalEarned: 0, totalWithdrawn: 0 },
    bets,
    transactions,
    role: session.user.role,
  });
}
