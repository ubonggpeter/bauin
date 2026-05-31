/**
 * GET /api/admin/approvals/stats
 * Returns today's auto-approved count, pending manual queue count, sample reviews today.
 */
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const [autoApprovedToday, manualQueue, sampleReviews, totalRules, activeRules] = await Promise.all([
    prisma.autoApprovalLog.count({
      where: { decision: "AUTO_APPROVED", createdAt: { gte: dayStart } },
    }),
    prisma.autoApprovalLog.count({
      where: { decision: "MANUAL_REVIEW", isSampleReview: false, adminOutcome: null },
    }),
    prisma.autoApprovalLog.count({
      where: { isSampleReview: true, createdAt: { gte: dayStart } },
    }),
    prisma.autoApprovalRule.count(),
    prisma.autoApprovalRule.count({ where: { isActive: true } }),
  ]);

  return NextResponse.json({ autoApprovedToday, manualQueue, sampleReviews, totalRules, activeRules });
}
