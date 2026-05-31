/**
 * GET /api/affiliate/status
 * Returns the current user's affiliate application status.
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

  const affiliate = await prisma.affiliate.findUnique({
    where:  { userId: session.user.id },
    select: {
      status:          true,
      promoCode:       true,
      applicationNote: true,
      reviewNote:      true,
      approvedAt:      true,
      createdAt:       true,
    },
  });

  return NextResponse.json({ affiliate });
}
