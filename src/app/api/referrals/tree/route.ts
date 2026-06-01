import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const cutoff = new Date(Date.now() - SIX_MONTHS_MS);

  const [me, referrals] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, referralCode: true, createdAt: true },
    }),
    prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referred: {
          select: { id: true, name: true, isActive: true, createdAt: true },
        },
        earnings: { select: { amount: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const recruits = referrals.map((r) => ({
    id:               r.referred.id,
    name:             r.referred.name ?? "Member",
    joinedAt:         r.referred.createdAt.toISOString(),
    isActive:         r.referred.isActive,
    inWindow:         r.referred.createdAt >= cutoff,
    totalEarned:      r.earnings.reduce((sum, e) => sum + Number(e.amount), 0),
    earningsUnlocked: r.earningsUnlocked,
    type:             r.type as string,
  }));

  return NextResponse.json({
    me: {
      id:            me.id,
      name:          me.name ?? "You",
      referralCode:  me.referralCode,
      joinedAt:      me.createdAt.toISOString(),
      recruitsCount: recruits.length,
      activeCount:   recruits.filter((r) => r.inWindow).length,
      totalEarned:   recruits.reduce((sum, r) => sum + r.totalEarned, 0),
    },
    recruits,
  });
}
