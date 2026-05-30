/**
 * GET  /api/pools  — list ACTIVE pools with live stats
 * POST /api/pools  — create a pool (checkAutoApproval → ACTIVE or PENDING_APPROVAL)
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAllSettings } from "@/lib/server/platform-settings";
import { checkAutoApproval, logApprovalDecision } from "@/lib/server/auto-approval";

export const dynamic = "force-dynamic";

// ── GET ───────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const url        = new URL(req.url);
  const showAll    = url.searchParams.get("all") === "1"; // include PENDING_APPROVAL (owner view)

  const pools = await prisma.toolPool.findMany({
    where:   showAll ? { ownerId: userId } : { status: "ACTIVE" },
    include: {
      owner:   { select: { id: true, name: true } },
      members: {
        where:  { status: "ACTIVE" },
        select: { userId: true, role: true, joinedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const items = pools.map((p) => {
    const memberCount  = p.members.length;
    const costPerMember = memberCount > 0
      ? Math.ceil(Number(p.monthlyCost) / memberCount)
      : Number(p.monthlyCost);
    const isJoined = p.members.some((m) => m.userId === userId);
    const isOwner  = p.ownerId === userId;

    return {
      id:            p.id,
      name:          p.name,
      description:   p.description,
      website:       p.website,
      monthlyCost:   Number(p.monthlyCost),
      capacity:      p.capacity,
      memberCount,
      costPerMember,
      status:        p.status,
      ownerName:     p.owner.name,
      isOwner,
      isJoined,
      nextRenewalAt: p.nextRenewalAt?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ pools: items });
}

// ── POST ──────────────────────────────────────────────────────────
type CreateBody = {
  name:        string;
  website?:    string;
  description?: string;
  monthlyCost: number;
  capacity:    number;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: CreateBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { name, website, description, monthlyCost, capacity } = body;

  if (!name?.trim() || name.trim().length < 2) {
    return NextResponse.json({ error: "Tool name must be at least 2 characters" }, { status: 400 });
  }
  if (!monthlyCost || monthlyCost < 100) {
    return NextResponse.json({ error: "Monthly cost must be at least ₦100" }, { status: 400 });
  }
  if (!capacity || capacity < 2 || capacity > 100) {
    return NextResponse.json({ error: "Max members must be between 2 and 100" }, { status: 400 });
  }

  // ── Auto-approval ─────────────────────────────────────────────
  const settings = await getAllSettings();
  const approval = await checkAutoApproval("TOOL_POOL", userId, {
    name:  name.trim(),
    price: monthlyCost,      // maps to maxPrice condition in rules
    description: description ?? "",
    capacity,
    website: website ?? "",
  });

  const nextRenewal = new Date();
  nextRenewal.setMonth(nextRenewal.getMonth() + 1);

  const poolStatus = approval.approved ? "ACTIVE" : "PENDING_APPROVAL";

  // ── Create pool + add owner as first member ───────────────────
  const pool = await prisma.$transaction(async (tx) => {
    const p = await tx.toolPool.create({
      data: {
        ownerId:      userId,
        name:         name.trim(),
        description:  description?.trim() ?? null,
        website:      website?.trim() ?? null,
        monthlyCost,
        capacity,
        status:       poolStatus,
        nextRenewalAt: poolStatus === "ACTIVE" ? nextRenewal : null,
      },
    });

    // Owner joins automatically
    await tx.toolPoolMember.create({
      data: {
        toolPoolId: p.id,
        userId,
        role:       "OWNER",
        status:     "ACTIVE",
        lastPaidAt: poolStatus === "ACTIVE" ? new Date() : null,
        nextDueAt:  poolStatus === "ACTIVE" ? nextRenewal : null,
      },
    });

    return p;
  });

  await logApprovalDecision(approval, userId, "TOOL_POOL", { name, monthlyCost, capacity });

  return NextResponse.json({
    poolId:      pool.id,
    status:      poolStatus,
    autoApproved: approval.approved,
    message: approval.approved
      ? "Pool created and live. Share the link so others can join."
      : "Pool submitted for review. You'll be notified within 1-2 business days.",
  }, { status: 201 });
}
