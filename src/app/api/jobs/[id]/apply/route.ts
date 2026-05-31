/**
 * POST /api/jobs/[id]/apply
 * Worker applies for a job. Requires a valid certificate in the job's category.
 * Body: { coverNote?: string }
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

  let body: { coverNote?: string } = {};
  try { body = await req.json(); } catch { /* optional */ }

  const job = await prisma.job.findUnique({
    where:  { id: params.id },
    select: { id: true, posterId: true, categoryId: true, status: true, title: true },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.posterId === userId) return NextResponse.json({ error: "Cannot apply to your own job" }, { status: 403 });
  if (job.status !== "OPEN") return NextResponse.json({ error: "Job is no longer accepting applications" }, { status: 409 });

  // Check certificate
  const cert = await prisma.userCertificate.findUnique({
    where: { userId_categoryId: { userId, categoryId: job.categoryId } },
  });
  if (!cert) return NextResponse.json({ error: "You need a certificate in this category to apply" }, { status: 403 });

  // Idempotent upsert
  const app = await prisma.jobApplication.upsert({
    where:  { jobId_workerId: { jobId: job.id, workerId: userId } },
    create: { jobId: job.id, workerId: userId, coverNote: body.coverNote?.trim() || null },
    update: {},
  });

  // Notify poster
  prisma.notification.create({
    data: {
      userId:  job.posterId,
      type:    "JOB_NEW_APPLICATION",
      title:   "New applicant on your job",
      body:     `Someone applied for "${job.title}"`,
      metadata: { jobId: job.id },
    },
  }).catch(() => {});

  return NextResponse.json({ applicationId: app.id });
}
