import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  let reason: string;
  try {
    const body = await req.json();
    reason = body.reason as string;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!reason?.trim()) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  const request = await prisma.investmentRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Request is not pending" }, { status: 400 });
  }

  await prisma.investmentRequest.update({
    where: { id },
    data: {
      status:     "REJECTED",
      reviewNote: reason,
      reviewedAt: new Date(),
      reviewedBy: admin.userId,
    },
  });

  return NextResponse.json({ rejected: true });
}
