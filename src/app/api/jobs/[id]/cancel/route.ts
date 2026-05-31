/**
 * POST /api/jobs/[id]/cancel
 * Poster cancels the job. Full budget is refunded from escrow.
 * Can only cancel when status is OPEN or ASSIGNED (not after submission).
 * Body: { reason?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { creditWallet } from "@/lib/server/wallet";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { reason?: string } = {};
  try { body = await req.json(); } catch { /* optional */ }

  const job = await prisma.job.findUnique({
    where:  { id: params.id },
    select: { id: true, posterId: true, status: true, budget: true, title: true, escrowRef: true },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.posterId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cancellable: string[] = ["OPEN", "ASSIGNED"];
  if (!cancellable.includes(job.status)) {
    return NextResponse.json({
      error: `Cannot cancel a job with status ${job.status}. Contact support for disputes.`,
    }, { status: 409 });
  }

  const budget    = Number(job.budget);
  const refundRef = `JOB-REFUND-${job.id.slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  await creditWallet(
    session.user.id,
    budget,
    "ADJUSTMENT",
    `Job cancelled — escrow refund: "${job.title.slice(0, 60)}"`,
    refundRef,
    { jobId: job.id, originalEscrowRef: job.escrowRef },
  );

  await prisma.job.update({
    where: { id: job.id },
    data:  {
      status:       "CANCELLED",
      cancelledAt:  new Date(),
      cancelReason: body.reason?.trim() || null,
    },
  });

  return NextResponse.json({ ok: true, refunded: budget });
}
