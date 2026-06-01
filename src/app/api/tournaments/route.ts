import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { date: "asc" },
    select: {
      id:          true,
      name:        true,
      description: true,
      entryFee:    true,
      prizePool:   true,
      date:        true,
      status:      true,
      _count:      { select: { entries: true, bets: true } },
    },
  });

  return NextResponse.json({ tournaments });
}
