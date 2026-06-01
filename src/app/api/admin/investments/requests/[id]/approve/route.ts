import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  let note: string | undefined;
  try {
    const body = await req.json();
    note = body.note as string | undefined;
  } catch {
    // note is optional
  }

  const request = await prisma.investmentRequest.findUnique({
    where: { id },
    include: { user: { select: { id: true } } },
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Request is not pending" }, { status: 400 });
  }

  const amount     = Number(request.amount);
  const roiPct     = Number(request.roiPct);
  const months     = request.months;
  const returnRate = roiPct / 100;
  const expectedReturn = Math.round(amount * (1 + returnRate));
  const maturityDate   = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);
  const tranche        = Math.round(amount * 0.25);

  const [, investment] = await prisma.$transaction([
    prisma.investmentRequest.update({
      where: { id },
      data: {
        status:     "APPROVED",
        reviewNote: note ?? null,
        reviewedAt: new Date(),
        reviewedBy: admin.userId,
      },
    }),
    prisma.investment.create({
      data: {
        userId:         request.userId,
        workerId:       request.userId,
        requestId:      id,
        amount,
        roiPct,
        months,
        returnRate,
        expectedReturn,
        escrowBalance:  amount - tranche,
        releasedAmount: tranche,
        milestonesPaid: 1,
        maturityDate,
        status:         "ACTIVE",
      },
    }),
  ]);

  return NextResponse.json({ investmentId: investment.id, approved: true });
}
