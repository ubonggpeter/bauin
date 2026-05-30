/**
 * POST /api/investments/request
 *
 * Worker submits an investment request.
 * Eligibility gates:
 *   - Account ≥ 30 days old
 *   - kycStatus not REJECTED
 *   - No existing PENDING or APPROVED request
 * Auto-approval: if amount ≤ INVESTMENT_AUTO_APPROVE_LIMIT (default ₦200,000)
 *                and checkAutoApproval passes → status APPROVED
 *                otherwise → PENDING (admin queue)
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAllSettings } from "@/lib/server/platform-settings";
import { checkAutoApproval, logApprovalDecision } from "@/lib/server/auto-approval";

export const dynamic = "force-dynamic";

type RequestBody = {
  amount:      number;
  description: string;
  roiPct:      number; // 5–20
  months:      number; // 1–24
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: RequestBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { amount, description, roiPct, months } = body;

  // ── Input validation ──────────────────────────────────────────
  if (!amount || amount < 1_000 || amount > 5_000_000) {
    return NextResponse.json({ error: "Amount must be between ₦1,000 and ₦5,000,000" }, { status: 400 });
  }
  if (!roiPct || roiPct < 5 || roiPct > 20) {
    return NextResponse.json({ error: "ROI must be between 5% and 20%" }, { status: 400 });
  }
  if (!months || months < 1 || months > 24) {
    return NextResponse.json({ error: "Duration must be 1–24 months" }, { status: 400 });
  }
  if (!description?.trim() || description.trim().length < 20) {
    return NextResponse.json({ error: "Purpose must be at least 20 characters" }, { status: 400 });
  }

  // ── Eligibility: load user ────────────────────────────────────
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { kycStatus: true, isActive: true, createdAt: true },
  });
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Account is not active" }, { status: 403 });
  }
  if (user.kycStatus === "REJECTED") {
    return NextResponse.json({ error: "KYC verification rejected" }, { status: 403 });
  }

  const ageMs   = Date.now() - user.createdAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < 30) {
    return NextResponse.json(
      { error: `Account must be at least 30 days old (${Math.ceil(30 - ageDays)} days remaining)` },
      { status: 403 },
    );
  }

  // ── Eligibility: no existing open request ─────────────────────
  const existing = await prisma.investmentRequest.findFirst({
    where: { userId, status: { in: ["PENDING", "APPROVED"] } },
    select: { id: true, status: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: `You already have a ${existing.status.toLowerCase()} investment request`, requestId: existing.id },
      { status: 409 },
    );
  }

  // ── Auto-approval ─────────────────────────────────────────────
  const settings       = await getAllSettings();
  const autoLimit      = Math.max(0, Number(settings["INVESTMENT_AUTO_APPROVE_LIMIT"] ?? "200000"));

  const approval = await checkAutoApproval("INVESTMENT_REQUEST", userId, {
    amount, description: description.trim(), roiPct, months,
    price: amount, // maps to maxPrice condition in AutoApprovalRule
  });

  const autoEligible = amount <= autoLimit;
  const isApproved   = autoEligible && approval.approved;
  const status       = isApproved ? "APPROVED" : "PENDING";

  // ── Create request ────────────────────────────────────────────
  const request = await prisma.investmentRequest.create({
    data: {
      userId,
      amount,
      description: description.trim(),
      roiPct,
      months,
      status,
    },
  });

  await logApprovalDecision(approval, userId, "INVESTMENT_REQUEST", { amount, roiPct, months });

  return NextResponse.json({
    requestId:    request.id,
    status,
    autoApproved: isApproved,
    message: isApproved
      ? "Your investment request is live on the marketplace."
      : "Your request is under review. You'll be notified within 1-2 business days.",
  }, { status: 201 });
}
