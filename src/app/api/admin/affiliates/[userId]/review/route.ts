/**
 * POST /api/admin/affiliates/[userId]/review
 * Approve or reject an affiliate application. Admin only.
 * Affiliate approval ALWAYS requires human review — no auto-approval.
 * Body: { decision: "APPROVED" | "REJECTED", reviewNote?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { decision?: string; reviewNote?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  if (!body.decision || !["APPROVED", "REJECTED"].includes(body.decision)) {
    return NextResponse.json({ error: "decision must be APPROVED or REJECTED" }, { status: 422 });
  }
  const decision = body.decision as "APPROVED" | "REJECTED";

  const affiliate = await prisma.affiliate.findUnique({
    where:  { userId: params.userId },
    select: { id: true, status: true, userId: true },
  });
  if (!affiliate) {
    return NextResponse.json({ error: "Affiliate application not found" }, { status: 404 });
  }
  if (affiliate.status !== "PENDING") {
    return NextResponse.json(
      { error: `Application is already ${affiliate.status}` },
      { status: 409 },
    );
  }

  await prisma.affiliate.update({
    where: { id: affiliate.id },
    data:  {
      status:       decision,
      reviewNote:   body.reviewNote?.trim() || null,
      reviewedAt:   new Date(),
      reviewedById: session.user.id,
      approvedAt:   decision === "APPROVED" ? new Date() : null,
    },
  });

  const notifType = decision === "APPROVED" ? "AFFILIATE_APPROVED" : "AFFILIATE_REJECTED";
  const title     = decision === "APPROVED"
    ? "Affiliate application approved!"
    : "Affiliate application not approved";
  const body_msg  = decision === "APPROVED"
    ? "Your affiliate application has been approved. You can now start sharing your promo link and earning bonuses."
    : `Your affiliate application was not approved.${body.reviewNote ? " Reason: " + body.reviewNote.trim() : ""}`;

  prisma.notification.create({
    data: {
      userId:   affiliate.userId,
      type:     notifType,
      title,
      body:     body_msg,
      metadata: { decision },
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, decision });
}
