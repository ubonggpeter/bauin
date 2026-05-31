/**
 * PATCH  /api/admin/approvals/rules/[id] — update (toggle active, edit conditions)
 * DELETE /api/admin/approvals/rules/[id] — delete a rule
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    name?: string;
    ruleType?: string;
    isActive?: boolean;
    conditions?: { field: string; operator: string; value: string }[];
    dailyLimitPerUser?: number | null;
    sampleReviewRate?: number;
  };

  const data: Prisma.AutoApprovalRuleUpdateInput = {};
  if (body.name       !== undefined) data.name       = body.name;
  if (body.ruleType   !== undefined) data.ruleType   = body.ruleType;
  if (body.isActive   !== undefined) data.isActive   = body.isActive;
  if (body.conditions !== undefined) data.conditionsJson = { conditions: body.conditions } as Prisma.InputJsonValue;
  if (body.dailyLimitPerUser !== undefined) data.dailyLimitPerUser = body.dailyLimitPerUser;
  if (body.sampleReviewRate  !== undefined) data.sampleReviewRate  = String(body.sampleReviewRate / 100);

  const rule = await prisma.autoApprovalRule.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ rule });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.autoApprovalRule.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
