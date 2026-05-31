/**
 * POST /api/jobs/[id]/submit
 * Assigned worker submits their work for review.
 * Body: { note?: string }
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
  const userId = session.user.id;

  let body: { note?: string } = {};
  try { body = await req.json(); } catch { /* optional */ }

  const job = await prisma.job.findUnique({
    where:  { id: params.id },
    select: { id: true, posterId: true, assignedWorkerId: true, status: true, title: true },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.assignedWorkerId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (job.status !== "ASSIGNED") return NextResponse.json({ error: "Job must be in ASSIGNED state to submit" }, { status: 409 });

  await prisma.job.update({
    where: { id: job.id },
    data:  {
      status:         "SUBMITTED",
      submissionNote: body.note?.trim() || null,
      submittedAt:    new Date(),
    },
  });

  // Notify poster
  prisma.notification.create({
    data: {
      userId:  job.posterId,
      type:    "JOB_SUBMITTED",
      title:   "Work submitted for review",
      body:     `The worker has submitted their work for "${job.title}". Please review and approve.`,
      metadata: { jobId: job.id },
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
