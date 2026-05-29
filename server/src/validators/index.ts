import { z } from "zod";

// ── Primitives ────────────────────────────────────────────────────────────────

const cuid = z.string().min(1);
const naira = z.number().positive();
const totpCode = z.string().regex(/^\d{6}$/, "Must be a 6-digit code");
const password = z.string().min(8, "Password must be at least 8 characters");

// ── Auth ──────────────────────────────────────────────────────────────────────

export const AuthSchemas = {
  register: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().min(7).max(20),
    password,
    referral_code: z.string().length(8).optional(),
  }),

  login: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),

  verifyEmail: z.object({
    token: z.string().min(1),
  }),

  forgotPassword: z.object({
    email: z.string().email(),
  }),

  resetPassword: z.object({
    token: z.string().min(1),
    password,
  }),
};

// ── Wallet ────────────────────────────────────────────────────────────────────

export const WalletSchemas = {
  withdraw: z.object({
    amount: naira,
    bankCode: z.string().min(1),
    accountNumber: z.string().regex(/^\d{10}$/, "Must be a 10-digit account number"),
    narration: z.string().max(100).optional(),
  }),
};

// ── Payments ──────────────────────────────────────────────────────────────────

export const PaymentSchemas = {
  initialize: z.object({
    amount: z.number().int().positive(),
    email: z.string().email(),
    payment_type: z.enum(["REGISTRATION", "QUIZ_ENTRY", "BET", "RETRY_FEE", "TOOL_POOL"]),
    metadata: z.record(z.unknown()).optional(),
    callback_url: z.string().url().optional(),
    currency: z.string().length(3).optional(),
  }),
};

// ── Quiz ──────────────────────────────────────────────────────────────────────

export const QuizSchemas = {
  joinSession: z.object({
    sessionId: cuid,
  }),

  submitAnswer: z.object({
    sessionId: cuid,
    questionId: cuid,
    answer: z.enum(["A", "B", "C", "D"]),
    timeTakenMs: z.number().int().positive(),
  }),

  placeBet: z.object({
    sessionId: cuid,
    betType: z.enum(["TOP1", "TOP3", "TOP5", "TOP10"]),
    predictedIds: z.array(cuid).min(1).max(10),
  }),
};

// ── Admin — auto-approval ─────────────────────────────────────────────────────

const OPERATORS = [
  "GREATER_THAN",
  "LESS_THAN",
  "EQUALS",
  "NOT_IN",
  "IN",
  "BETWEEN",
] as const;

const ConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(OPERATORS),
  value: z.unknown(),
});

export const AdminAutoApprovalSchemas = {
  condition: ConditionSchema,

  rule: z.object({
    name: z.string().min(2).max(120),
    ruleType: z.string().min(1).max(50).toUpperCase(),
    conditions: z.array(ConditionSchema),
    isActive: z.boolean().optional(),
    dailyLimitPerUser: z.number().int().positive().nullable().optional(),
    sampleReviewRate: z.number().min(0).max(1).optional(),
  }),

  logQuery: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    userId: z.string().optional(),
    requestType: z.string().optional(),
    decision: z.string().optional(),
    ruleId: z.string().optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
  }),
};

// ── Admin — auth & 2FA ────────────────────────────────────────────────────────

export const AdminAuthSchemas = {
  challenge: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),

  session: z.object({
    challengeId: z.string().min(1),
    totpCode,
  }),

  totpCode: z.object({ totpCode }),
};

// ── Upload ────────────────────────────────────────────────────────────────────

export const UploadSchemas = {
  videoMeta: z.object({
    storyId: cuid.optional(),
    episodeNumber: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .refine((n) => n >= 1, "episodeNumber must be ≥ 1")
      .optional(),
  }),
};
