/**
 * GET /api/affiliate/dashboard
 * Stats and referrals for approved affiliates only.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getNumericSetting } from "@/lib/server/platform-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const affiliate = await prisma.affiliate.findUnique({
    where:  { userId: session.user.id },
    select: {
      id:            true,
      status:        true,
      promoCode:     true,
      earningsTotal: true,
      createdAt:     true,
      referrals: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id:            true,
          bonusPaid:     true,
          bonusPaidAt:   true,
          createdAt:     true,
          referredUser: {
            select: { name: true, createdAt: true },
          },
        },
      },
    },
  });

  if (!affiliate) {
    return NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }
  if (affiliate.status !== "APPROVED") {
    return NextResponse.json({ error: "Affiliate account not active" }, { status: 403 });
  }

  const bonusPerReg = await getNumericSetting("AFFILIATE_BONUS_PER_REG", 2000);

  const totalReferrals = affiliate.referrals.length;
  const paidReferrals  = affiliate.referrals.filter((r) => r.bonusPaid).length;

  return NextResponse.json({
    promoCode:     affiliate.promoCode,
    earningsTotal: Number(affiliate.earningsTotal),
    bonusPerReg,
    totalReferrals,
    paidReferrals,
    pendingReferrals: totalReferrals - paidReferrals,
    referrals: affiliate.referrals,
    joinedAt:  affiliate.createdAt,
  });
}
