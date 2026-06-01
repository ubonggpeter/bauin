import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const investments = await prisma.investment.findMany({
    where: { status: { in: ["MATURED", "CANCELLED"] } },
    include: {
      user:   { select: { id: true, name: true, email: true } },
      worker: { select: { id: true, name: true, email: true } },
    },
    orderBy: { maturedAt: "desc" },
  });

  return NextResponse.json({ investments });
}
