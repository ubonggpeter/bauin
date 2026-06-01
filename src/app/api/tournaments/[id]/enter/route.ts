import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function verifyPaystack(reference: string, expectedNaira: number) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return { ok: true };
  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` }, cache: "no-store",
    });
    if (!res.ok) return { ok: false };
    const body = await res.json() as { status: boolean; data?: { status: string; amount: number } };
    if (!body.status || body.data?.status !== "success") return { ok: false };
    const expected = Math.round(expectedNaira * 100);
    return { ok: Math.abs(body.data.amount - expected) <= 1 };
  } catch { return { ok: false }; }
}

type EnterBody = {
  paystackReference: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: EnterBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { paystackReference } = body;
  if (!paystackReference) {
    return NextResponse.json({ error: "paystackReference is required" }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({ where: { id: params.id } });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  if (!["UPCOMING", "LIVE"].includes(tournament.status)) {
    return NextResponse.json({ error: "Tournament is not accepting entries" }, { status: 400 });
  }

  const { ok } = await verifyPaystack(paystackReference, Number(tournament.entryFee));
  if (!ok) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 402 });
  }

  const existing = await prisma.tournamentEntry.findFirst({
    where: { tournamentId: params.id, userId },
  });
  if (existing) {
    return NextResponse.json({ error: "You have already entered this tournament" }, { status: 409 });
  }

  const entry = await prisma.tournamentEntry.create({
    data: {
      tournamentId: params.id,
      userId,
      paystackRef:  paystackReference,
    },
  });

  return NextResponse.json({ entryId: entry.id }, { status: 201 });
}
