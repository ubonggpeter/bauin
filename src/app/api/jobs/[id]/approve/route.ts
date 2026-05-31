/**
 * POST /api/jobs/[id]/approve
 * Poster approves the submitted work.
 * Releases escrow: worker earns budget × (1 − platformFee%).
 * Platform fee stays as platform revenue (no wallet credit, logged in metadata).
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { creditWallet } from "@/lib/server/wallet";
import { getAllSettings } from "@/lib/server/platform-settings";
import { checkAchievements, checkEarningsMilestones } from "@/lib/server/achievements";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await prisma.job.findUnique({
    where:   { id: params.id },
    select:  { id: true, posterId: true, assignedWorkerId: true, status: true, budget: true, title: true, escrowRef: true },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.posterId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (job.status !== "SUBMITTED") return NextResponse.json({ error: "Job must be SUBMITTED before approval" }, { status: 409 });
  if (!job.assignedWorkerId) return NextResponse.json({ error: "No assigned worker" }, { status: 500 });

  const settings    = await getAllSettings();
  const feePct      = Math.max(0, Math.min(50, Number(settings["JOB_PLATFORM_FEE_PCT"] ?? "10")));
  const budget      = Number(job.budget);
  const platformFee = Math.round(budget * feePct / 100);
  const payout      = budget - platformFee;

  const payRef = `JOB-PAY-${job.id.slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  await creditWallet(
    job.assignedWorkerId,
    payout,
    "JOB_PAYMENT",
    `Job payment: "${job.title.slice(0, 60)}"`,
    payRef,
    { jobId: job.id, budget, feePct, platformFee, escrowRef: job.escrowRef },
  );

  await prisma.job.update({
    where: { id: job.id },
    data:  { status: "APPROVED", approvedAt: new Date() },
  });

  // Achievements + earnings milestone checks
  checkAchievements(job.assignedWorkerId, { type: "JOB_COMPLETED" }).catch(() => {});
  checkEarningsMilestones(job.assignedWorkerId).catch(() => {});

  // Notify worker
  prisma.notification.create({
    data: {
      userId:  job.assignedWorkerId,
      type:    "JOB_APPROVED",
      title:   "Job approved — payment released!",
      body:     `Your work on "${job.title}" was approved. ₦${payout.toLocaleString()} has been added to your wallet.`,
      metadata: { jobId: job.id, payout },
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, payout, platformFee });
}
