/**
 * GET /api/referral
 * Returns worker + viewer referral data for the authenticated user.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAllSettings } from "@/lib/server/platform-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const [settings, me, workerReferrals, viewerReferrals] = await Promise.all([
    getAllSettings(),
    prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } }),
    prisma.referral.findMany({
      where:   { referrerId: userId, type: "WORKER" },
      include: {
        referred: { select: { id: true, name: true, createdAt: true } },
        earnings: { where: { source: "WORKER_PAYMENT" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.referral.findMany({
      where:   { referrerId: userId, type: "VIEWER" },
      include: {
        referred: { select: { id: true, name: true } },
        earnings: true,
      },
      orderBy: { recruitsCount: "desc" },
    }),
  ]);

  const workerPaymentPct      = Math.max(0, Math.min(100, Number(settings["REFERRAL_WORKER_PAYMENT_PCT"]     ?? "50")));
  const viewerPct             = Math.max(0, Math.min(100, Number(settings["REFERRAL_VIEWER_PCT"]             ?? "30")));
  const viewerUnlockThreshold = Math.max(1,               Number(settings["REFERRAL_VIEWER_UNLOCK_THRESHOLD"] ?? "30"));

  const workerTotalEarned = workerReferrals.reduce(
    (sum, r) => sum + r.earnings.reduce((s, e) => s + Number(e.amount), 0),
    0,
  );

  const viewerTotalLocked = viewerReferrals.reduce(
    (sum, r) => sum + r.earnings
      .filter((e) => e.source === "VIEWER_QUIZ_LOCKED")
      .reduce((s, e) => s + Number(e.amount), 0),
    0,
  );
  const viewerTotalUnlocked = viewerReferrals.reduce(
    (sum, r) => sum + r.earnings
      .filter((e) => e.source === "VIEWER_QUIZ_UNLOCKED")
      .reduce((s, e) => s + Number(e.amount), 0),
    0,
  );

  return NextResponse.json({
    userId,
    referralCode:        me?.referralCode ?? userId,
    workerPaymentPct,
    viewerPct,
    viewerUnlockThreshold,
    totalViewerRecruits: viewerReferrals.length,
    workerTotalEarned,
    viewerTotalLocked,
    viewerTotalUnlocked,
    workerReferrals: workerReferrals.map((r) => ({
      id:           r.id,
      referredId:   r.referredId,
      referredName: r.referred.name ?? `User ${r.referredId.slice(-4)}`,
      joinedAt:     r.createdAt.toISOString(),
      totalBonus:   r.earnings.reduce((s, e) => s + Number(e.amount), 0),
    })),
    viewerReferrals: viewerReferrals.map((r) => ({
      id:               r.id,
      referredId:       r.referredId,
      referredName:     r.referred.name ?? `Player ${r.referredId.slice(-4)}`,
      recruitsCount:    r.recruitsCount,
      unlockThreshold:  r.unlockThreshold,
      earningsUnlocked: r.earningsUnlocked,
      lockedAmount:     r.earnings
        .filter((e) => e.source === "VIEWER_QUIZ_LOCKED")
        .reduce((s, e) => s + Number(e.amount), 0),
      unlockedAmount: r.earnings
        .filter((e) => e.source === "VIEWER_QUIZ_UNLOCKED")
        .reduce((s, e) => s + Number(e.amount), 0),
    })),
  });
}
