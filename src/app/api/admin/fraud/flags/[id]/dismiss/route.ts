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

  const flag = await prisma.fraudFlag.findUnique({
    where: { id: params.id },
    select: { id: true, status: true },
  });
  if (!flag)               return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (flag.status !== "PENDING") {
    return NextResponse.json({ error: "Flag is not pending" }, { status: 400 });
  }

  await prisma.fraudFlag.update({
    where: { id: params.id },
    data: {
      status:       "DISMISSED",
      resolved:     true,
      resolvedAt:   new Date(),
      resolvedById: admin.userId,
      note:         note ?? null,
    },
  });

  return NextResponse.json({ dismissed: true });
}
