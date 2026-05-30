/**
 * POST /api/pools/[id]/join
 * Join an ACTIVE pool. Charges the first month's share immediately.
 * Pool must not be at capacity.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { debitWallet, creditWallet } from "@/lib/server/wallet";
import { getAllSettings } from "@/lib/server/platform-settings";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const poolId = params.id;

  const pool = await prisma.toolPool.findUnique({
    where:   { id: poolId },
    include: { members: { where: { status: "ACTIVE" } } },
  });

  if (!pool)                      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  if (pool.status !== "ACTIVE")   return NextResponse.json({ error: "Pool is not active" }, { status: 400 });
  if (pool.ownerId === userId)     return NextResponse.json({ error: "You own this pool" }, { status: 400 });

  const existing = pool.members.find((m) => m.userId === userId);
  if (existing) {
    if (existing.status === "ACTIVE") return NextResponse.json({ error: "Already a member" }, { status: 409 });
    // Re-activate suspended member
  }

  const memberCount = pool.members.length;
  if (memberCount >= pool.capacity) {
    return NextResponse.json({ error: "Pool is at capacity" }, { status: 400 });
  }

  // First month charge: cost / (memberCount + 1) = new per-member share
  const settings   = await getAllSettings();
  const feePct     = Math.max(0, Math.min(100, Number(settings["TOOL_POOL_FEE_PCT"] ?? "5")));
  const newCount   = memberCount + 1;
  const shareGross = Math.ceil(Number(pool.monthlyCost) / newCount);
  const platformFee = Math.round(shareGross * feePct / 100);
  const shareNet   = shareGross - platformFee;

  const nextDueAt  = new Date();
  nextDueAt.setMonth(nextDueAt.getMonth() + 1);

  const ref = `POOL-JOIN-${poolId.slice(-6)}-${userId.slice(-6)}-${Date.now().toString(36).toUpperCase()}`;

  // Debit member
  try {
    await debitWallet(
      userId, shareGross, "TOOL_POOL_FEE",
      `Joined pool "${pool.name}" — monthly share (${feePct}% platform fee applied)`,
      ref,
      { poolId, feePct, shareNet, platformFee },
    );
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }
    throw err;
  }

  // Credit pool owner (net of platform fee)
  if (shareNet > 0) {
    await creditWallet(
      pool.ownerId, shareNet, "ADJUSTMENT",
      `Pool fee income: "${pool.name}" — new member joined`,
      `${ref}-OWNER`,
      { poolId, userId, feePct },
    );
  }

  // Upsert membership
  await prisma.toolPoolMember.upsert({
    where:  { toolPoolId_userId: { toolPoolId: poolId, userId } },
    create: { toolPoolId: poolId, userId, role: "MEMBER", status: "ACTIVE", lastPaidAt: new Date(), nextDueAt },
    update: { status: "ACTIVE", lastPaidAt: new Date(), nextDueAt },
  });

  return NextResponse.json({
    poolId,
    charged:     shareGross,
    platformFee,
    shareNet,
    nextDueAt:   nextDueAt.toISOString(),
    message:     `Joined "${pool.name}". Next payment due ${nextDueAt.toLocaleDateString()}.`,
  });
}
