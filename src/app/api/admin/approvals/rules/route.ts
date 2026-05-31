/**
 * GET  /api/admin/approvals/rules — list all rules
 * POST /api/admin/approvals/rules — create a rule
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rules = await prisma.autoApprovalRule.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { logs: true } } },
  });

  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    name: string;
    ruleType: string;
    conditions: { field: string; operator: string; value: string }[];
    dailyLimitPerUser?: number | null;
    sampleReviewRate?: number;
  };

  if (!body.name?.trim())     return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (!body.ruleType?.trim()) return NextResponse.json({ error: "Rule type required" }, { status: 400 });

  const rule = await prisma.autoApprovalRule.create({
    data: {
      name: body.name.trim(),
      ruleType: body.ruleType.trim(),
      conditionsJson: { conditions: body.conditions ?? [] } as Prisma.InputJsonValue,
      isActive: true,
      dailyLimitPerUser: body.dailyLimitPerUser ?? null,
      sampleReviewRate: body.sampleReviewRate != null ? String(body.sampleReviewRate / 100) : "0",
    },
  });

  return NextResponse.json({ rule }, { status: 201 });
}
