/**
 * POST /api/admin/kyc/[userId]/review
 * Body: { decision: "APPROVED" | "REJECTED", reviewNote?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { reviewKyc } from "@/lib/server/kyc";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { decision: string; reviewNote?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { decision, reviewNote } = body;
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return NextResponse.json({ error: "decision must be APPROVED or REJECTED" }, { status: 422 });
  }

  try {
    await reviewKyc({
      userId:     params.userId,
      decision,
      reviewNote,
      adminId:    admin.userId,
    });
    return NextResponse.json({ ok: true, decision });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Review failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
