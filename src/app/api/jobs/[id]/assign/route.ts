/**
 * POST /api/jobs/[id]/assign
 * Poster assigns the job to a specific applicant.
 * Body: { workerId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { workerId?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  if (!body.workerId) return NextResponse.json({ error: "workerId required" }, { status: 422 });

  const job = await prisma.job.findUnique({
    where:  { id: params.id },
    select: { id: true, posterId: true, status: true, title: true },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.posterId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (job.status !== "OPEN") return NextResponse.json({ error: "Job cannot be assigned in its current state" }, { status: 409 });

  // Worker must have applied
  const app = await prisma.jobApplication.findUnique({
    where: { jobId_workerId: { jobId: job.id, workerId: body.workerId } },
  });
  if (!app) return NextResponse.json({ error: "Worker has not applied for this job" }, { status: 422 });

  await prisma.job.update({
    where: { id: job.id },
    data:  { status: "ASSIGNED", assignedWorkerId: body.workerId },
  });

  // Auto-set BUSY when worker reaches 3+ active (ASSIGNED + SUBMITTED) jobs
  const activeCount = await prisma.job.count({
    where: {
      assignedWorkerId: body.workerId,
      status:           { in: ["ASSIGNED", "SUBMITTED"] },
    },
  });
  if (activeCount >= 3) {
    await prisma.user.update({
      where: { id: body.workerId },
      data:  { workerStatus: "BUSY" },
    });
  }

  // Notify worker
  prisma.notification.create({
    data: {
      userId:  body.workerId,
      type:    "JOB_ASSIGNED",
      title:   "You've been assigned a job!",
      body:     `You were selected for "${job.title}". Start working and submit when done.`,
      metadata: { jobId: job.id },
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
