/**
 * GET /api/admin/approvals/queue
 * Returns pending manual-review items (not yet actioned by admin).
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type  = searchParams.get("type") ?? "";
  const page  = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const skip  = (page - 1) * limit;

  const where = {
    decision:      "MANUAL_REVIEW" as const,
    adminOutcome:  null,
    ...(type ? { requestType: type } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.autoApprovalLog.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
      include: {
        rule: { select: { name: true, ruleType: true } },
      },
    }),
    prisma.autoApprovalLog.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pages: Math.ceil(total / limit) });
}
