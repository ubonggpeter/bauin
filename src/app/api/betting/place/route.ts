/**
 * POST /api/betting/place
 *
 * Verify Paystack stake payment → create Bet record.
 * One bet per user per session.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invalidateCachedSession } from "@/lib/server/quiz-cache";

export const dynamic = "force-dynamic";

async function verifyPaystack(reference: string, expectedNaira: number) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return { ok: true };
  try {
    const res  = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" }
    );
    if (!res.ok) return { ok: false };
    const body = await res.json() as { status: boolean; data?: { status: string; amount: number } };
    if (!body.status || body.data?.status !== "success") return { ok: false };
    return { ok: Math.abs(body.data.amount - Math.round(expectedNaira * 100)) <= 1 };
  } catch { return { ok: false }; }
}

type PlaceBody = {
  sessionId:         string;
  betType:           "TOP1" | "TOP3" | "TOP5" | "TOP10";
  predictedIds:      string[];  // QuizEntry IDs
  stake:             number;    // ₦
  paystackReference: string;
};

const REQUIRED: Record<string, number> = { TOP1: 1, TOP3: 3, TOP5: 5, TOP10: 10 };
const MULTI:    Record<string, number> = { TOP1: 9, TOP3: 5, TOP5: 3, TOP10: 2  };

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: PlaceBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { sessionId, betType, predictedIds, stake, paystackReference } = body;

  if (!REQUIRED[betType]) {
    return NextResponse.json({ error: "Invalid bet type" }, { status: 400 });
  }
  if (!Array.isArray(predictedIds) || predictedIds.length !== REQUIRED[betType]) {
    return NextResponse.json(
      { error: `${betType} requires exactly ${REQUIRED[betType]} predicted player(s)` },
      { status: 400 }
    );
  }
  if (!stake || stake < 100) {
    return NextResponse.json({ error: "Minimum stake is ₦100" }, { status: 400 });
  }

  // ── Verify session active ─────────────────────────────────────
  const quizSession = await prisma.quizSession.findUnique({
    where:   { id: sessionId },
    include: { distributorCollection: { select: { publicLinkCode: true } } },
  });
  if (!quizSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!["PENDING", "ACTIVE"].includes(quizSession.status)) {
    return NextResponse.json({ error: "Session is not accepting bets" }, { status: 400 });
  }

  // ── Idempotency: one bet per session ──────────────────────────
  const existing = await prisma.bet.findFirst({ where: { userId, quizSessionId: sessionId } });
  if (existing) {
    return NextResponse.json({ error: "You have already placed a bet on this session" }, { status: 409 });
  }

  // ── Verify payment ────────────────────────────────────────────
  const { ok } = await verifyPaystack(paystackReference, stake);
  if (!ok) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 402 });
  }

  // ── Verify predicted entry IDs belong to this session ─────────
  const validEntries = await prisma.quizEntry.findMany({
    where: { id: { in: predictedIds }, quizSessionId: sessionId },
    select: { id: true },
  });
  if (validEntries.length !== predictedIds.length) {
    return NextResponse.json({ error: "One or more predicted player IDs are invalid" }, { status: 400 });
  }

  // ── Create bet ────────────────────────────────────────────────
  const bet = await prisma.bet.create({
    data: {
      userId,
      quizSessionId: sessionId,
      type:          betType,
      stake,
      predictedIds,
      status:        "OPEN",
    },
  });

  // Invalidate session cache so prizePool counter updates
  const code = quizSession.distributorCollection?.publicLinkCode;
  if (code) await invalidateCachedSession(code);

  return NextResponse.json({
    betId:           bet.id,
    betType,
    stake,
    potentialPayout: stake * (MULTI[betType] ?? 1),
    status:          "OPEN",
  });
}
