import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let flagId: string, reason: string;
  try {
    const body = await req.json();
    flagId = body.flagId as string;
    reason = body.reason as string;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!flagId?.trim()) return NextResponse.json({ error: "flagId is required" }, { status: 400 });
  if (!reason?.trim()) return NextResponse.json({ error: "reason is required" }, { status: 400 });

  const flag = await prisma.fraudFlag.findUnique({
    where: { id: flagId },
    select: { id: true, userId: true, status: true },
  });
  if (!flag || flag.userId !== userId) {
    return NextResponse.json({ error: "Flag not found" }, { status: 404 });
  }
  if (flag.status === "DISMISSED") {
    return NextResponse.json({ error: "This flag has already been dismissed" }, { status: 400 });
  }

  // Only one pending appeal per flag
  const existing = await prisma.fraudAppeal.findFirst({
    where: { flagId, userId, status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json({ error: "You already have a pending appeal for this flag" }, { status: 409 });
  }

  const appeal = await prisma.fraudAppeal.create({
    data: { flagId, userId, reason },
  });

  return NextResponse.json({ appealId: appeal.id }, { status: 201 });
}
