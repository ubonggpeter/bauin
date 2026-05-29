import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { randomBytes } from "crypto";

import { prisma } from "../utils/prisma";
import { authenticate, type AuthRequest } from "../middleware/authenticate";
import {
  initializePayment,
  verifyPayment,
  type PaystackTransactionData,
} from "../services/paystack.service";
import { creditWallet, recordExternalPayment } from "../services/wallet.service";
import { incrementPrizePool } from "../utils/redis";
import { enqueueEmail } from "../services/email";
import { validateRequest } from "../middleware/validateRequest";
import { PaymentSchemas } from "../validators";

const router = Router();

// ── Types ─────────────────────────────────────────────────────────────────────

type PaymentType = "REGISTRATION" | "QUIZ_ENTRY" | "BET" | "RETRY_FEE" | "TOOL_POOL";

interface BaseMeta {
  payment_type: PaymentType;
  user_id: string;
}
interface RegistrationMeta extends BaseMeta {
  payment_type: "REGISTRATION";
  category_id: string;
}
interface QuizEntryMeta extends BaseMeta {
  payment_type: "QUIZ_ENTRY";
  quiz_session_id: string;
}
interface BetMeta extends BaseMeta {
  payment_type: "BET";
  quiz_session_id: string;
  bet_type: "TOP1" | "TOP3" | "TOP5" | "TOP10";
  predicted_ids: string[];
}
interface RetryFeeMeta extends BaseMeta {
  payment_type: "RETRY_FEE";
  category_id: string;
}
interface ToolPoolMeta extends BaseMeta {
  payment_type: "TOOL_POOL";
  tool_pool_id: string;
}

type PaymentMeta =
  | RegistrationMeta
  | QuizEntryMeta
  | BetMeta
  | RetryFeeMeta
  | ToolPoolMeta;

// ── Helpers ───────────────────────────────────────────────────────────────────

function genReference(): string {
  return `BAUIN-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY ?? "")
    .update(rawBody)
    .digest("hex");
  return hash === signature;
}

function koboToNaira(kobo: number): number {
  return kobo / 100;
}

// ── Webhook handlers ──────────────────────────────────────────────────────────

async function handleRegistration(
  txn: PaystackTransactionData,
  meta: RegistrationMeta
): Promise<void> {
  const { user_id, category_id } = meta;

  // Fetch category for fee amounts and name
  const category = await prisma.category.findUnique({ where: { id: category_id } });
  if (!category) throw new Error(`Category ${category_id} not found`);

  const amountNaira = koboToNaira(txn.amount);

  // 1 — Activate UserCategory (30-day subscription)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.userCategory.upsert({
    where: { userId_categoryId: { userId: user_id, categoryId: category_id } },
    create: {
      userId: user_id,
      categoryId: category_id,
      paidRegistration: true,
      isActive: true,
      expiresAt,
    },
    update: {
      paidRegistration: true,
      isActive: true,
      expiresAt,
    },
  });

  // Log inbound payment
  await recordExternalPayment({
    userId: user_id,
    amountNaira,
    type: "CATEGORY_REGISTRATION",
    description: `Registration fee — ${category.name}`,
    reference: txn.reference,
    metadata: { category_id, paystack_id: txn.id },
  });

  // 2 — Credit referrer 50% of registration fee
  const user = await prisma.user.findUnique({
    where: { id: user_id },
    select: { referredById: true, name: true, email: true },
  });

  if (user?.referredById) {
    const commission = Number(category.registrationFee) * 0.5;

    await creditWallet({
      userId: user.referredById,
      amountNaira: commission,
      type: "REFERRAL_BONUS",
      description: `50% registration commission — ${category.name}`,
      reference: `${txn.reference}-REF`,
      metadata: { source_user_id: user_id, category_id },
    });

    // Update Referral record
    const referral = await prisma.referral.findFirst({
      where: { referrerId: user.referredById, referredId: user_id },
    });
    if (referral) {
      await prisma.$transaction([
        prisma.referralEarning.create({
          data: {
            referralId: referral.id,
            amount: commission,
            source: "REGISTRATION_FEE",
            description: `50% of ₦${Number(category.registrationFee).toLocaleString()} registration for ${category.name}`,
          },
        }),
        prisma.referral.update({
          where: { id: referral.id },
          data: {
            recruitsCount: { increment: 1 },
            earningsUnlocked: { set: true },
          },
        }),
      ]);
    }
  }

  // 3 — Welcome email + in-app notification
  if (user?.email) {
    enqueueEmail({
      to: user.email,
      userId: user_id,
      template: {
        type: "WELCOME_AFTER_PAYMENT",
        data: {
          name: user.name,
          categoryName: category.name,
          dashboardUrl: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/dashboard`,
        },
      },
    }).catch((e) => console.error("[welcome-email]", e));
  }
}

async function handleQuizEntry(
  txn: PaystackTransactionData,
  meta: QuizEntryMeta
): Promise<void> {
  const { user_id, quiz_session_id } = meta;
  const amountNaira = koboToNaira(txn.amount);

  // 1 — Create QuizEntry (idempotent)
  await prisma.quizEntry.upsert({
    where: {
      quizSessionId_userId: { quizSessionId: quiz_session_id, userId: user_id },
    },
    create: { quizSessionId: quiz_session_id, userId: user_id },
    update: {},
  });

  // 2 — Increment Redis prize pool
  await incrementPrizePool(quiz_session_id, amountNaira);

  await recordExternalPayment({
    userId: user_id,
    amountNaira,
    type: "DEPOSIT",
    description: "Quiz entry fee",
    reference: txn.reference,
    metadata: { quiz_session_id, paystack_id: txn.id },
  });
}

async function handleBet(
  txn: PaystackTransactionData,
  meta: BetMeta
): Promise<void> {
  const { user_id, quiz_session_id, bet_type, predicted_ids } = meta;
  const stake = koboToNaira(txn.amount);

  await prisma.bet.create({
    data: {
      userId: user_id,
      quizSessionId: quiz_session_id,
      type: bet_type,
      stake,
      predictedIds: predicted_ids,
      status: "OPEN",
    },
  });

  await recordExternalPayment({
    userId: user_id,
    amountNaira: stake,
    type: "BET_STAKE",
    description: `${bet_type} bet stake`,
    reference: txn.reference,
    metadata: { quiz_session_id, bet_type, paystack_id: txn.id },
  });
}

async function handleRetryFee(
  txn: PaystackTransactionData,
  meta: RetryFeeMeta
): Promise<void> {
  const { user_id, category_id } = meta;
  const amountNaira = koboToNaira(txn.amount);

  // Record payment; the application checks for this transaction
  // before granting a new TestAttempt with is_retry=true
  await recordExternalPayment({
    userId: user_id,
    amountNaira,
    type: "CATEGORY_RETRY_FEE",
    description: `Test retry fee`,
    reference: txn.reference,
    metadata: {
      category_id,
      retry_unlocked: true,
      paystack_id: txn.id,
    },
  });
}

async function handleToolPool(
  txn: PaystackTransactionData,
  meta: ToolPoolMeta
): Promise<void> {
  const { user_id, tool_pool_id } = meta;
  const amountNaira = koboToNaira(txn.amount);

  // Create membership and record payment atomically
  await prisma.toolPoolMember.upsert({
    where: { toolPoolId_userId: { toolPoolId: tool_pool_id, userId: user_id } },
    create: { toolPoolId: tool_pool_id, userId: user_id, role: "MEMBER" },
    update: {},
  });

  await recordExternalPayment({
    userId: user_id,
    amountNaira,
    type: "TOOL_POOL_FEE",
    description: "Tool pool membership fee",
    reference: txn.reference,
    metadata: { tool_pool_id, member_paid: true, paystack_id: txn.id },
  });
}

// ── POST /api/payments/initialize ─────────────────────────────────────────────

router.post("/initialize", authenticate, validateRequest({ body: PaymentSchemas.initialize }), async (req: AuthRequest, res, next) => {
  try {
  const { amount, email, payment_type, metadata, callback_url, currency } = req.body;
  const reference = genReference();

  try {
    const result = await initializePayment({
      email,
      amount,
      reference,
      currency,
      callback_url,
      metadata: {
        payment_type,
        user_id: req.userId,
        ...metadata,
      },
    });

    res.json({ ...result, reference });
  } catch (err) {
    next(err instanceof Error && err.message ? err : new Error("Payment init failed"));
  }
  } catch (err) { next(err); }
});

// ── POST /api/payments/verify/:reference ──────────────────────────────────────

router.get("/verify/:reference", authenticate, async (req, res) => {
  try {
    const txn = await verifyPayment(req.params.reference);
    res.json({ status: txn.status, amount: koboToNaira(txn.amount), reference: txn.reference });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Verification failed";
    res.status(400).json({ error: msg });
  }
});

// ── POST /api/payments/webhook ────────────────────────────────────────────────
// NOTE: This route receives express.raw() body (set in index.ts before express.json())

router.post("/webhook", async (req, res) => {
  const signature = req.headers["x-paystack-signature"] as string;

  // Always respond 200 quickly to Paystack, then process
  res.sendStatus(200);

  const rawBody = (req.body as Buffer).toString("utf8");

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[webhook] Invalid signature — ignoring");
    return;
  }

  let event: { event: string; data: PaystackTransactionData };
  try {
    event = JSON.parse(rawBody);
  } catch {
    console.warn("[webhook] Malformed JSON");
    return;
  }

  if (event.event !== "charge.success") return;

  const txn = event.data;
  const meta = txn.metadata as unknown as PaymentMeta;

  if (!meta?.payment_type || !meta?.user_id) {
    console.warn("[webhook] Missing payment_type or user_id in metadata");
    return;
  }

  try {
    switch (meta.payment_type) {
      case "REGISTRATION":
        await handleRegistration(txn, meta as RegistrationMeta);
        break;
      case "QUIZ_ENTRY":
        await handleQuizEntry(txn, meta as QuizEntryMeta);
        break;
      case "BET":
        await handleBet(txn, meta as BetMeta);
        break;
      case "RETRY_FEE":
        await handleRetryFee(txn, meta as RetryFeeMeta);
        break;
      case "TOOL_POOL":
        await handleToolPool(txn, meta as ToolPoolMeta);
        break;
      default:
        console.warn("[webhook] Unknown payment_type:", (meta as BaseMeta).payment_type);
    }
  } catch (err) {
    console.error(`[webhook] Handler error for ${meta.payment_type}:`, err);
  }
});

export default router;
