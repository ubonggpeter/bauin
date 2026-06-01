import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type CreateBody = {
  name:           string;
  description?:   string;
  entryFee:       number;
  prizePool:      number;
  quizSessionId:  string;
  date:           string;
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: CreateBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { name, description, entryFee, prizePool, quizSessionId, date } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (typeof entryFee !== "number" || entryFee < 0) {
    return NextResponse.json({ error: "entryFee must be a non-negative number" }, { status: 400 });
  }
  if (typeof prizePool !== "number" || prizePool < 0) {
    return NextResponse.json({ error: "prizePool must be a non-negative number" }, { status: 400 });
  }
  if (!quizSessionId?.trim()) {
    return NextResponse.json({ error: "quizSessionId is required" }, { status: 400 });
  }
  if (!date || isNaN(Date.parse(date))) {
    return NextResponse.json({ error: "date must be a valid ISO date string" }, { status: 400 });
  }

  const tournament = await prisma.tournament.create({
    data: {
      name:          name.trim(),
      description:   description?.trim() ?? null,
      entryFee,
      prizePool,
      quizSessionId: quizSessionId.trim(),
      date:          new Date(date),
    },
  });

  return NextResponse.json({ tournament }, { status: 201 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
      createdAt:   true,
      updatedAt:   true,
      _count:      { select: { entries: true, bets: true } },
    },
  });

  return NextResponse.json({ tournaments });
}
