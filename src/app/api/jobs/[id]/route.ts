/**
 * GET /api/jobs/[id]
 * Returns full job details. Includes applicants only if caller is the poster.
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
  const userId = session.user.id;

  const job = await prisma.job.findUnique({
    where:   { id: params.id },
    include: {
      category:       { select: { id: true, name: true, slug: true } },
      poster:         { select: { id: true, name: true } },
      assignedWorker: { select: { id: true, name: true } },
      _count:         { select: { applications: true } },
      applications:   userId
        ? {
            where:   { workerId: userId },
            select:  { id: true, createdAt: true },
            take:    1,
          }
        : false,
    },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const isPoster = job.posterId === userId;

  return NextResponse.json({
    job: {
      ...job,
      budget:  Number(job.budget),
      applied: (job.applications as { id: string }[]).length > 0,
      isOwner: isPoster,
    },
  });
}
