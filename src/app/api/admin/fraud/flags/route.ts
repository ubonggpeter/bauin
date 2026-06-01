import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const SEVERITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const flags = await prisma.fraudFlag.findMany({
    include: {
      user:    { select: { id: true, name: true, email: true, fraudSuspendedAt: true, isActive: true } },
      appeals: { select: { id: true, status: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  // Sort: PENDING first, then by severity HIGH→LOW, then by date
  const sorted = flags.sort((a, b) => {
    const pendingDiff = (a.status === "PENDING" ? 0 : 1) - (b.status === "PENDING" ? 0 : 1);
    if (pendingDiff !== 0) return pendingDiff;
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return NextResponse.json({ flags: sorted });
}
