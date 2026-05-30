import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAllSettings } from "@/lib/server/platform-settings";

export const dynamic = "force-dynamic";

// ── Paystack verification ─────────────────────────────────────────
async function verifyPaystack(
  reference: string,
  expectedNaira: number
): Promise<{ ok: boolean; amountKobo: number }> {
  const secret = process.env.PAYSTACK_SECRET_KEY;

  // No secret key = dev bypass
  if (!secret) {
    return { ok: true, amountKobo: expectedNaira * 100 };
  }

  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" }
    );
    if (!res.ok) return { ok: false, amountKobo: 0 };

    const body = await res.json() as {
      status: boolean;
      data?: { status: string; amount: number };
    };

    if (!body.status || body.data?.status !== "success") {
      return { ok: false, amountKobo: body.data?.amount ?? 0 };
    }

    // Allow ±1 kobo tolerance
    const expected = Math.round(expectedNaira * 100);
    const actual   = body.data.amount;
    return { ok: Math.abs(actual - expected) <= 1, amountKobo: actual };
  } catch {
    return { ok: false, amountKobo: 0 };
  }
}

// ── Unique publicLinkCode generation ─────────────────────────────
function makeCode(): string {
  // timestamp (4 chars) + random (5 chars) → ~9-char code, collision-safe
  const ts   = Date.now().toString(36).slice(-4).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${ts}${rand}`;
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = makeCode();
    const exists = await prisma.distributorCollection.findUnique({
      where: { publicLinkCode: code },
    });
    if (!exists) return code;
  }
  // Extremely unlikely to reach here; add extra entropy
  return `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

// ── Route handler ─────────────────────────────────────────────────
type PurchaseBody = {
  storyId:           string;
  paystackReference: string;
  referralCode?:     string; // publicLinkCode from an existing DistributorCollection
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: PurchaseBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { storyId, paystackReference, referralCode } = body;
  if (!storyId || !paystackReference) {
    return NextResponse.json({ error: "storyId and paystackReference are required" }, { status: 400 });
  }

  // ── Load story ───────────────────────────────────────────────
  const story = await prisma.story.findUnique({ where: { id: storyId, isPublished: true } });
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  // ── Prevent self-purchase ───────────────────────────────────
  if (story.authorId === userId) {
    return NextResponse.json({ error: "Cannot purchase your own story" }, { status: 400 });
  }

  // ── Already purchased? ───────────────────────────────────────
  const alreadyBought = await prisma.storyPurchase.findFirst({
    where: { userId, storyId },
  });
  if (alreadyBought) {
    return NextResponse.json({ error: "Already purchased" }, { status: 409 });
  }

  // ── Load all fees from PlatformSettings (never hardcoded) ───
  const settings       = await getAllSettings();
  const commissionPct  = Math.max(0, Math.min(100, Number(settings["PLATFORM_COMMISSION_PCT"]    ?? "20")));
  const royaltyPct     = Math.max(0, Math.min(100, Number(settings["STORY_ROYALTY_PCT_DEFAULT"]  ?? "15")));
  const royaltyEnabled =
    (settings["STORY_ROYALTY_ENABLED"] ?? "true") === "true" || settings["STORY_ROYALTY_ENABLED"] === "1";

  const storyPrice = Number(story.price);

  // ── Verify payment (skip for free stories) ───────────────────
  if (!story.isFree) {
    const { ok } = await verifyPaystack(paystackReference, storyPrice);
    if (!ok) {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 402 });
    }
  }

  // ── Resolve referral distributor ──────────────────────────────
  let referrerDc: { id: string; userId: string } | null = null;
  if (referralCode && royaltyEnabled) {
    referrerDc = await prisma.distributorCollection.findUnique({
      where:  { publicLinkCode: referralCode },
      select: { id: true, userId: true },
    });
    // Ignore self-referral
    if (referrerDc?.userId === userId) referrerDc = null;
  }

  // ── Fee maths ─────────────────────────────────────────────────
  const platformFee   = storyPrice * (commissionPct / 100);
  const referralFee   = (referrerDc && royaltyEnabled) ? storyPrice * (royaltyPct / 100) : 0;
  const sellerNet     = Math.max(0, storyPrice - platformFee - referralFee);
  const amountPaid    = story.isFree ? 0 : storyPrice;

  // ── Generate unique code before the transaction ───────────────
  const publicLinkCode = await uniqueCode();

  // ── Atomic DB transaction ─────────────────────────────────────
  const result = await prisma.$transaction(async (tx) => {
    // Double-check inside transaction
    const doubleCheck = await tx.storyPurchase.findFirst({ where: { userId, storyId } });
    if (doubleCheck) throw Object.assign(new Error("ALREADY_PURCHASED"), { code: "ALREADY_PURCHASED" });

    // 1. StoryPurchase record
    const purchase = await tx.storyPurchase.create({
      data: { userId, storyId, amountPaid },
    });

    // 2. DistributorCollection — buyer's referral entity
    const dc = await tx.distributorCollection.create({
      data: {
        userId,
        name:          `story-${storyId}`,
        publicLinkCode,
        isInUse:       true,
        description:   `Referral link for story: ${story.title} | storyId:${storyId}`,
      },
    });

    // 3. Credit seller (if not free and seller exists)
    if (!story.isFree && story.authorId && sellerNet > 0) {
      const sellerWallet = await tx.wallet.upsert({
        where:  { userId: story.authorId },
        create: { userId: story.authorId, balance: 0, totalDeposited: 0, totalWithdrawn: 0, totalEarned: 0 },
        update: {},
      });

      const sellerBefore = Number(sellerWallet.balance);
      await tx.wallet.update({
        where: { userId: story.authorId },
        data:  { balance: { increment: sellerNet }, totalEarned: { increment: sellerNet } },
      });
      await tx.transaction.create({
        data: {
          walletId:      sellerWallet.id,
          userId:        story.authorId,
          type:          "STORY_PURCHASE",
          amount:        sellerNet,
          balanceBefore: sellerBefore,
          balanceAfter:  sellerBefore + sellerNet,
          description:   `Story sale: "${story.title}" — net after ${commissionPct}% platform fee${referralFee > 0 ? ` + ${royaltyPct}% referral` : ""}`,
          reference:     `STORY-SALE-${purchase.id}`,
          status:        "COMPLETED",
          metadata: {
            storyId,
            buyerId:      userId,
            storyPrice,
            commissionPct,
            referralPct:  referralFee > 0 ? royaltyPct : 0,
          },
        },
      });
    }

    // 4. Credit referrer (if applicable)
    if (referrerDc && referralFee > 0) {
      const refWallet = await tx.wallet.upsert({
        where:  { userId: referrerDc.userId },
        create: { userId: referrerDc.userId, balance: 0, totalDeposited: 0, totalWithdrawn: 0, totalEarned: 0 },
        update: {},
      });

      const refBefore = Number(refWallet.balance);
      await tx.wallet.update({
        where: { userId: referrerDc.userId },
        data:  { balance: { increment: referralFee }, totalEarned: { increment: referralFee } },
      });
      await tx.transaction.create({
        data: {
          walletId:      refWallet.id,
          userId:        referrerDc.userId,
          type:          "STORY_PURCHASE",
          amount:        referralFee,
          balanceBefore: refBefore,
          balanceAfter:  refBefore + referralFee,
          description:   `Referral commission: "${story.title}" (${royaltyPct}% of ₦${storyPrice.toLocaleString()})`,
          reference:     `STORY-REF-${purchase.id}`,
          status:        "COMPLETED",
          metadata: {
            storyId,
            buyerId:          userId,
            storyPrice,
            royaltyPct,
            referrerCollectionId: referrerDc.id,
          },
        },
      });
    }

    return {
      purchaseId:             purchase.id,
      publicLinkCode:         dc.publicLinkCode,
      distributorCollectionId: dc.id,
    };
  });

  return NextResponse.json({
    ...result,
    storyId,
    sellerNet,
    referralFee,
    platformFee,
    commissionPct,
    royaltyPct:      referralFee > 0 ? royaltyPct : 0,
  });
}
