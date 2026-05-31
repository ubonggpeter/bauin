/**
 * GET /api/admin/kyc/list?status=SUBMITTED&page=1&limit=20
 * Admin: list KYC submissions for review.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "SUBMITTED";
  const page   = Math.max(1, Number(searchParams.get("page")  ?? "1"));
  const limit  = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20")));
  const skip   = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    prisma.kycDocument.findMany({
      where:   { user: { kycStatus: status as never } },
      include: {
        user: {
          select: {
            id:        true,
            name:      true,
            email:     true,
            createdAt: true,
            kycStatus: true,
            fraudFlags: {
              where:  { resolved: false },
              select: { type: true, severity: true, createdAt: true },
              take:   3,
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      skip,
      take:    limit,
    }),
    prisma.kycDocument.count({
      where: { user: { kycStatus: status as never } },
    }),
  ]);

  const items = docs.map((d) => ({
    id:           d.id,
    userId:       d.userId,
    userName:     d.user.name,
    userEmail:    d.user.email,
    accountAgeDays: Math.floor((Date.now() - d.user.createdAt.getTime()) / 86400_000),
    docType:      d.docType,
    autoApproved: d.autoApproved,
    reviewNote:   d.reviewNote,
    reviewedAt:   d.reviewedAt,
    createdAt:    d.createdAt,
    fraudFlags:   d.user.fraudFlags,
  }));

  return NextResponse.json({ items, total, page, pages: Math.ceil(total / limit) });
}
