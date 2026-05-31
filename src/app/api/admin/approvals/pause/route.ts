/**
 * POST /api/admin/approvals/pause
 * Emergency pause: sets all AutoApprovalRules isActive=false.
 * Body: { pause: true } to pause, { pause: false } to resume.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { pause: boolean };
  const result = await prisma.autoApprovalRule.updateMany({
    data: { isActive: !body.pause },
  });

  return NextResponse.json({
    updated: result.count,
    allActive: !body.pause,
    message: body.pause
      ? `All ${result.count} rules paused. Manual review required for all requests.`
      : `All ${result.count} rules resumed.`,
  });
}
