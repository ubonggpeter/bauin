/**
 * POST /api/pools/[id]/leave
 * Leave a pool (sets member status to LEFT). No refund for current month.
 * Pool owner cannot leave — must transfer ownership or cancel pool.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
    include: { members: { where: { userId } } },
  });

  if (!pool) return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  if (pool.ownerId === userId) {
    return NextResponse.json({ error: "Pool owner cannot leave — cancel or transfer ownership first" }, { status: 400 });
  }

  const membership = pool.members[0];
  if (!membership || membership.status === "LEFT") {
    return NextResponse.json({ error: "You are not a member of this pool" }, { status: 400 });
  }

  await prisma.toolPoolMember.update({
    where: { id: membership.id },
    data:  { status: "LEFT" },
  });

  return NextResponse.json({ message: `Left pool "${pool.name}". No refund for current period.` });
}
