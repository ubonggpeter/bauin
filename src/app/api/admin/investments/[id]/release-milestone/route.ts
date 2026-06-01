import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";
import { creditWallet } from "@/lib/server/wallet";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  const investment = await prisma.investment.findUnique({ where: { id } });
  if (!investment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (investment.status !== "ACTIVE") {
    return NextResponse.json({ error: "Investment is not active" }, { status: 400 });
  }
  if (investment.milestonesPaid >= 4) {
    return NextResponse.json({ error: "All milestones already paid" }, { status: 400 });
  }

  const escrow        = Number(investment.escrowBalance);
  const tranche       = Math.round(Number(investment.amount) * 0.25);
  const releaseAmount = Math.min(tranche, escrow);

  if (releaseAmount <= 0) {
    return NextResponse.json({ error: "No escrow balance to release" }, { status: 400 });
  }

  const newMilestones    = investment.milestonesPaid + 1;
  const newEscrow        = escrow - releaseAmount;
  const newReleased      = Number(investment.releasedAmount) + releaseAmount;
  const isFullyPaid      = newMilestones >= 4;
  const ref              = `milestone-${id}-${newMilestones}-${Date.now()}`;

  await creditWallet(
    investment.workerId,
    releaseAmount,
    "INVESTMENT_RETURN",
    `Investment milestone ${newMilestones}/4 released by admin`,
    ref,
    { investmentId: id, milestone: newMilestones, releasedBy: admin.userId },
  );

  await prisma.investment.update({
    where: { id },
    data: {
      escrowBalance:  newEscrow,
      releasedAmount: newReleased,
      milestonesPaid: newMilestones,
      ...(isFullyPaid ? { status: "MATURED", maturedAt: new Date() } : {}),
    },
  });

  return NextResponse.json({
    released:       releaseAmount,
    milestonesPaid: newMilestones,
    escrowBalance:  newEscrow,
    matured:        isFullyPaid,
  });
}
