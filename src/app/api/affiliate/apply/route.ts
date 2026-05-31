/**
 * POST /api/affiliate/apply
 * Authenticated user submits an affiliate programme application.
 * Body: { applicationNote?: string }
 * Creates an Affiliate record with status PENDING. All approvals are manual.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generatePromoCode } from "@/lib/server/affiliate";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: { applicationNote?: string } = {};
  try { body = await req.json(); } catch { /* optional */ }

  // Prevent duplicate pending/approved applications
  const existing = await prisma.affiliate.findUnique({
    where:  { userId },
    select: { status: true },
  });
  if (existing) {
    if (existing.status === "APPROVED") {
      return NextResponse.json({ error: "You are already an approved affiliate" }, { status: 409 });
    }
    if (existing.status === "PENDING") {
      return NextResponse.json({ error: "Your application is already under review" }, { status: 409 });
    }
    if (existing.status === "SUSPENDED") {
      return NextResponse.json({ error: "Your affiliate account is suspended. Contact support." }, { status: 403 });
    }
    // REJECTED — allow re-application by updating existing record
    await prisma.affiliate.update({
      where: { userId },
      data:  {
        status:          "PENDING",
        applicationNote: body.applicationNote?.trim() || null,
        reviewNote:      null,
        reviewedAt:      null,
        reviewedById:    null,
        approvedAt:      null,
      },
    });
    return NextResponse.json({ ok: true, reapplied: true });
  }

  // Generate a unique promo code (retry loop for collisions)
  let promoCode = generatePromoCode();
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.affiliate.findUnique({ where: { promoCode } });
    if (!clash) break;
    promoCode = generatePromoCode();
  }

  await prisma.affiliate.create({
    data: {
      userId,
      promoCode,
      applicationNote: body.applicationNote?.trim() || null,
    },
  });

  return NextResponse.json({ ok: true });
}
