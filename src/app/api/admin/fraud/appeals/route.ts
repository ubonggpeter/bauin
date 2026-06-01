import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appeals = await prisma.fraudAppeal.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      flag: {
        select: {
          id: true, type: true, severity: true, status: true, evidence: true, createdAt: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ appeals });
}
