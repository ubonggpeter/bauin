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

  let note: string | undefined;
  try { note = (await req.json()).note as string | undefined; } catch { /* optional */ }

  const appeal = await prisma.fraudAppeal.findUnique({
    where: { id: params.id },
    include: { flag: { select: { userId: true } } },
  });
  if (!appeal)                      return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (appeal.status !== "PENDING")  return NextResponse.json({ error: "Appeal is not pending" }, { status: 400 });

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.fraudAppeal.update({
      where: { id: params.id },
      data: {
        status:       "APPROVED",
        reviewNote:   note ?? null,
        reviewedById: admin.userId,
        reviewedAt:   now,
      },
    });

    // Dismiss the underlying flag
    await tx.fraudFlag.update({
      where: { id: appeal.flagId },
      data: {
        status:       "DISMISSED",
        resolved:     true,
        resolvedAt:   now,
        resolvedById: admin.userId,
        note:         "Flag dismissed via approved appeal",
      },
    });

    // Unsuspend the user if they were fraud-suspended
    await tx.user.update({
      where: { id: appeal.flag.userId },
      data: {
        isActive:         true,
        fraudSuspendedAt: null,
      },
    });
  });

  return NextResponse.json({ approved: true });
}
