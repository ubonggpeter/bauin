/**
 * GET /api/jobs/assigned
 * Returns jobs where the current user is the assigned worker.
 * Statuses: ASSIGNED, SUBMITTED, APPROVED
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await prisma.job.findMany({
    where: {
      assignedWorkerId: session.user.id,
      status: { in: ["ASSIGNED", "SUBMITTED", "APPROVED"] },
    },
    include: {
      poster: { select: { id: true, name: true, avatarUrl: true } },
      category: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ jobs });
}
