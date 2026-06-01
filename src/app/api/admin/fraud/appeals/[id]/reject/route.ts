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

  let reason: string;
  try { reason = (await req.json()).reason as string; }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  if (!reason?.trim()) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  const appeal = await prisma.fraudAppeal.findUnique({ where: { id: params.id } });
  if (!appeal)                     return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (appeal.status !== "PENDING") return NextResponse.json({ error: "Appeal is not pending" }, { status: 400 });

  await prisma.fraudAppeal.update({
    where: { id: params.id },
    data: {
      status:       "REJECTED",
      reviewNote:   reason,
      reviewedById: admin.userId,
      reviewedAt:   new Date(),
    },
  });

  return NextResponse.json({ rejected: true });
}
