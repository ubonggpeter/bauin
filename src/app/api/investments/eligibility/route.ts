/**
 * GET /api/investments/eligibility
 * Returns whether the authenticated user can submit an investment request,
 * and their current open request if any.
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
  const userId = session.user.id;

  const [user, openRequest] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: { kycStatus: true, isActive: true, createdAt: true },
    }),
    prisma.investmentRequest.findFirst({
      where:  { userId, status: { in: ["PENDING", "APPROVED"] } },
      select: { id: true, status: true, amount: true, roiPct: true, months: true, description: true },
    }),
  ]);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const ageDays = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const checks  = {
    active: user.isActive,
    kycOk:  user.kycStatus !== "REJECTED",
    ageOk:  ageDays >= 30,
    ageDays,
    noOpen: !openRequest,
  };

  const reasons: string[] = [];
  if (!checks.active)  reasons.push("Account is not active");
  if (!checks.kycOk)   reasons.push("KYC verification was rejected");
  if (!checks.ageOk)   reasons.push(`Account must be 30 days old (${30 - ageDays} days remaining)`);
  if (!checks.noOpen)  reasons.push(`You have an existing ${openRequest?.status.toLowerCase()} request`);

  return NextResponse.json({
    eligible: reasons.length === 0,
    reasons,
    checks,
    openRequest: openRequest
      ? {
          id:          openRequest.id,
          status:      openRequest.status,
          amount:      Number(openRequest.amount),
          roiPct:      Number(openRequest.roiPct),
          months:      openRequest.months,
          description: openRequest.description ?? "",
        }
      : null,
  });
}
