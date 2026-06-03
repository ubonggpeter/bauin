/**
 * GET /api/jobs/[id]/applicants
 * Poster views the list of applicants for their job.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await prisma.job.findUnique({
    where:  { id: params.id },
    select: { posterId: true },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.posterId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apps = await prisma.jobApplication.findMany({
    where:   { jobId: params.id },
    include: {
      worker: {
        select: {
          id:           true,
          name:         true,
          avatarUrl:    true,
          workerStatus: true,
          certificates: { select: { categoryId: true } },
          achievements: {
            include: { achievement: { select: { key: true, name: true, icon: true } } },
          },
          _count: {
            select: {
              assignedJobs: { where: { status: "APPROVED" } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ applicants: apps });
}
