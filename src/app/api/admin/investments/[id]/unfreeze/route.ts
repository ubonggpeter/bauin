import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  const investment = await prisma.investment.findUnique({ where: { id } });
  if (!investment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!investment.isFrozen) {
    return NextResponse.json({ error: "Investment is not frozen" }, { status: 400 });
  }

  await prisma.investment.update({
    where: { id },
    data: {
      isFrozen:       false,
      frozenAt:       null,
      lastActivityAt: new Date(),
    },
  });

  return NextResponse.json({ unfrozen: true });
}
