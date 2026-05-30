/**
 * POST /api/quiz/enter
 *
 * Verify Paystack payment → create QuizEntry → record viewer referral.
 * Idempotent: re-entering with the same session returns existing entry.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getNumericSetting } from "@/lib/server/platform-settings";
import {
  getCachedSession, invalidateCachedSession,
} from "@/lib/server/quiz-cache";

export const dynamic = "force-dynamic";

// ── Paystack verify ───────────────────────────────────────────────
async function verifyPaystack(reference: string, expectedNaira: number) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return { ok: true }; // dev bypass
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

type EnterBody = {
  code:               string;
  paystackReference:  string;
  viewerReferrerId?:  string; // userId of the person who shared the link
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: EnterBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { code, paystackReference, viewerReferrerId } = body;
  if (!code || !paystackReference) {
    return NextResponse.json({ error: "code and paystackReference are required" }, { status: 400 });
  }

  // ── Load collection (cache-first) ────────────────────────────
  const cached = await getCachedSession(code);

  const collection = await prisma.distributorCollection.findUnique({
    where: { publicLinkCode: code },
  });
  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }
  if (!collection.isInUse) {
    return NextResponse.json({ error: "Collection is not active" }, { status: 400 });
  }

  // ── Find or create active QuizSession ────────────────────────
  let quizSession = await prisma.quizSession.findFirst({
    where: {
      distributorCollectionId: collection.id,
      status: { in: ["PENDING", "ACTIVE"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!quizSession) {
    quizSession = await prisma.quizSession.create({
      data: {
        distributorCollectionId: collection.id,
        title:  collection.name,
        status: "PENDING",
      },
    });
  }

  // ── Check for existing entry (idempotent) ─────────────────────
  const existing = await prisma.quizEntry.findFirst({
    where: { quizSessionId: quizSession.id, userId },
  });
  if (existing) {
    return NextResponse.json({
      entryId:   existing.id,
      sessionId: quizSession.id,
      alreadyEntered: true,
    });
  }

  // ── Verify payment ────────────────────────────────────────────
  const entryFee = cached?.entryFee ?? await getNumericSetting("QUIZ_ENTRY_FEE", 500);
  const { ok }   = await verifyPaystack(paystackReference, entryFee);
  if (!ok) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 402 });
  }

  // ── Atomic: create entry + activate session + record referral ─
  const result = await prisma.$transaction(async (tx) => {
    // Double-check inside tx
    const dbl = await tx.quizEntry.findFirst({ where: { quizSessionId: quizSession!.id, userId } });
    if (dbl) return { entry: dbl, doubled: true };

    const entry = await tx.quizEntry.create({
      data: { quizSessionId: quizSession!.id, userId },
    });

    // Activate if still PENDING
    if (quizSession!.status === "PENDING") {
      await tx.quizSession.update({
        where: { id: quizSession!.id },
        data:  { status: "ACTIVE", startedAt: new Date() },
      });
    }

    // Viewer referral tracking
    if (viewerReferrerId && viewerReferrerId !== userId) {
      await tx.referral.upsert({
        where: { referrerId_referredId: { referrerId: viewerReferrerId, referredId: userId } },
        create: {
          referrerId:      viewerReferrerId,
          referredId:      userId,
          type:            "VIEWER",
          recruitsCount:   1,
          unlockThreshold: 5, // unlock earnings after 5 recruits
        },
        update: { recruitsCount: { increment: 1 } },
      });
    }

    return { entry, doubled: false };
  });

  // ── Invalidate Redis so next poll gets fresh player count ─────
  await invalidateCachedSession(code);

  return NextResponse.json({
    entryId:   result.entry.id,
    sessionId: quizSession.id,
    alreadyEntered: result.doubled,
  });
}
