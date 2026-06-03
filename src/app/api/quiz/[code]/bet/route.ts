import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBoolSetting } from "@/lib/server/platform-settings";

export const dynamic = "force-dynamic";

async function verifyPaystack(reference: string, expectedNaira: number) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return { ok: true };
  try {
    const res  = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` }, cache: "no-store",
    });
    if (!res.ok) return { ok: false };
    const body = await res.json() as { status: boolean; data?: { status: string; amount: number } };
    if (!body.status || body.data?.status !== "success") return { ok: false };
    const expected = Math.round(expectedNaira * 100);
    return { ok: Math.abs(body.data.amount - expected) <= 1 };
  } catch { return { ok: false }; }
}

type BetBody = {
  betType:           "TOP1" | "TOP3" | "TOP5" | "TOP10";
  predictedIds:      string[];   // QuizEntry IDs
  stake:             number;     // ₦ amount
  paystackReference: string;
};

const REQUIRED_PICKS: Record<string, number> = { TOP1: 1, TOP3: 3, TOP5: 5, TOP10: 10 };

export async function POST(
  req: Request,
  { params }: { params: { code: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { code } = params;

  if (await getBoolSetting("SYSTEM_PAUSE_BETTING", false)) {
    return NextResponse.json(
      { error: "Betting is temporarily paused. Please check back shortly." },
      { status: 503 },
    );
  }

  let body: BetBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { betType, predictedIds, stake, paystackReference } = body;

  if (!betType || !REQUIRED_PICKS[betType]) {
    return NextResponse.json({ error: "Invalid bet type" }, { status: 400 });
  }
  if (!Array.isArray(predictedIds) || predictedIds.length !== REQUIRED_PICKS[betType]) {
    return NextResponse.json({ error: `${betType} requires exactly ${REQUIRED_PICKS[betType]} predicted players` }, { status: 400 });
  }
  if (!stake || stake < 100) {
    return NextResponse.json({ error: "Minimum stake is ₦100" }, { status: 400 });
  }

  const { ok } = await verifyPaystack(paystackReference, stake);
  if (!ok) return NextResponse.json({ error: "Payment verification failed" }, { status: 402 });

  const collection = await prisma.distributorCollection.findUnique({ where: { publicLinkCode: code } });
  if (!collection) return NextResponse.json({ error: "Collection not found" }, { status: 404 });

  const quizSession = await prisma.quizSession.findFirst({
    where: { distributorCollectionId: collection.id, status: { in: ["PENDING", "ACTIVE"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!quizSession) return NextResponse.json({ error: "No active session" }, { status: 404 });

  const existing = await prisma.bet.findFirst({ where: { userId, quizSessionId: quizSession.id } });
  if (existing) return NextResponse.json({ error: "You have already placed a bet on this session" }, { status: 409 });

  const bet = await prisma.bet.create({
    data: {
      userId,
      quizSessionId: quizSession.id,
      type:          betType,
      stake,
      predictedIds:  predictedIds,
      status:        "OPEN",
    },
  });

  return NextResponse.json({ betId: bet.id, betType, stake, status: "OPEN" });
}
