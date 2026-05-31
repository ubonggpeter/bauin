/**
 * GET /api/kyc/status
 * Returns the current KYC status for the authenticated user.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: {
      kycStatus:        true,
      fraudSuspendedAt: true,
      kycDocument:      {
        select: {
          docType:     true,
          autoApproved: true,
          reviewNote:  true,
          createdAt:   true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    status:           user.kycStatus,
    fraudSuspended:   !!user.fraudSuspendedAt,
    submission:       user.kycDocument
      ? {
          docType:     user.kycDocument.docType,
          autoApproved: user.kycDocument.autoApproved,
          reviewNote:  user.kycDocument.reviewNote,
          submittedAt: user.kycDocument.createdAt,
        }
      : null,
  });
}
