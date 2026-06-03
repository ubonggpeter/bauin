/**
 * PATCH /api/worker/status
 * Worker manually sets their availability status.
 * Auto-BUSY (set by the assign route) is preserved — workers can override
 * back to AVAILABLE if they choose, or set ON_LEAVE to pause all inbound work.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const VALID = ["AVAILABLE", "BUSY", "ON_LEAVE"] as const;
type WorkerStatus = typeof VALID[number];

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { status?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const status = body.status as WorkerStatus | undefined;
  if (!status || !VALID.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID.join(", ")}` },
      { status: 422 },
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data:  { workerStatus: status },
  });

  return NextResponse.json({ ok: true, status });
}

export async function GET(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: {
      workerStatus:  true,
      achievements:  {
        include: { achievement: { select: { key: true, name: true, icon: true } } },
        orderBy: { earnedAt: "asc" },
      },
    },
  });

  const approvedJobs = await prisma.job.count({
    where: { assignedWorkerId: session.user.id, status: "APPROVED" },
  });

  const activeJobs = await prisma.job.count({
    where: {
      assignedWorkerId: session.user.id,
      status:           { in: ["ASSIGNED", "SUBMITTED"] },
    },
  });

  return NextResponse.json({
    workerStatus: user?.workerStatus ?? "AVAILABLE",
    achievements: user?.achievements.map((ua) => ua.achievement) ?? [],
    approvedJobs,
    activeJobs,
  });
}
