import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  const entries = await prisma.changelog.findMany({
    orderBy: { date: "desc" },
    take: limit,
    select: {
      id: true, version: true, date: true,
      category: true, title: true, description: true,
    },
  });

  return NextResponse.json({ entries });
}
