/**
 * Unit tests for referral-earnings pure arithmetic.
 *
 * The DB-touching functions (onPaymentReferralCredit, onViewerQuizEntry,
 * unlockViewerEarnings) are tested via a mock Prisma transaction so we verify
 * the credit amounts without hitting a real database.
 */

// ── Mock heavy dependencies before importing the module under test ──
jest.mock("@/lib/server/email", () => ({
  sendReferralUnlockedEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/server/push", () => ({
  push: { referralEarned: jest.fn().mockResolvedValue(undefined) },
}));

import { onPaymentReferralCredit, onViewerQuizEntry } from "@/lib/server/referral-earnings";

// ── Shared mock tx factory ────────────────────────────────────────
function makeTx(overrides: Record<string, unknown> = {}) {
  const walletUpdate = jest.fn().mockResolvedValue({ id: "w1", balance: 0 });
  const walletUpsert = jest.fn().mockResolvedValue({ id: "w1", balance: 0 });
  const txCreate     = jest.fn().mockResolvedValue({});
  const refEarnCreate = jest.fn().mockResolvedValue({ id: "re1" });
  const referralUpsert = jest.fn().mockResolvedValue({ id: "ref1", recruitsCount: 1, unlockThreshold: 5, earningsUnlocked: false });
  const referralUpdate = jest.fn().mockResolvedValue({});
  const referralFindFirst = jest.fn().mockResolvedValue(null);
  const referralFindUnique = jest.fn().mockResolvedValue({ id: "ref1", recruitsCount: 1, unlockThreshold: 5, earningsUnlocked: false });
  const userFindUnique    = jest.fn().mockResolvedValue({ email: "ref@test.com", name: "Ref User" });

  return {
    wallet:         { upsert: walletUpsert, update: walletUpdate },
    transaction:    { create: txCreate },
    referralEarning: { create: refEarnCreate, findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn().mockResolvedValue({}) },
    referral:        { findFirst: referralFindFirst, upsert: referralUpsert, findUnique: referralFindUnique, update: referralUpdate },
    user:            { findUnique: userFindUnique },
    ...overrides,
  };
}

const DEFAULT_SETTINGS: Record<string, string> = {
  REFERRAL_WORKER_PAYMENT_PCT:  "50",
  REFERRAL_WORKER_EXPIRY_MONTHS: "6",
  REFERRAL_VIEWER_PCT:           "30",
  REFERRAL_VIEWER_UNLOCK_THRESHOLD: "5",
};

// ── WORKER referral: 50% of payment ─────────────────────────────
describe("onPaymentReferralCredit — worker 50% bonus", () => {
  it("does nothing when no WORKER referral exists for the user", async () => {
    const tx = makeTx();
    await onPaymentReferralCredit(tx as never, "user-a", 1000, "pay-ref", "category", DEFAULT_SETTINGS);
    expect(tx.wallet.update).not.toHaveBeenCalled();
  });

  it("credits referrer with 50% of payment when referral exists", async () => {
    const tx = makeTx({
      referral: {
        findFirst: jest.fn().mockResolvedValue({ id: "ref1", referrerId: "referrer-1" }),
      },
    });
    await onPaymentReferralCredit(tx as never, "user-a", 1000, "pay-ref", "category", DEFAULT_SETTINGS);
    // bonus = Math.round(1000 * 50 / 100) = 500
    const updateCall = (tx.wallet.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.balance.increment).toBe(500);
    expect(updateCall.data.totalEarned.increment).toBe(500);
  });

  it("respects a custom REFERRAL_WORKER_PAYMENT_PCT setting", async () => {
    const tx = makeTx({
      referral: {
        findFirst: jest.fn().mockResolvedValue({ id: "ref1", referrerId: "referrer-1" }),
      },
    });
    await onPaymentReferralCredit(tx as never, "user-a", 1000, "pay-ref", "category", {
      ...DEFAULT_SETTINGS,
      REFERRAL_WORKER_PAYMENT_PCT: "20",
    });
    const updateCall = (tx.wallet.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.balance.increment).toBe(200); // Math.round(1000 * 20/100)
  });

  it("does not credit when bonus rounds to 0", async () => {
    const tx = makeTx({
      referral: {
        findFirst: jest.fn().mockResolvedValue({ id: "ref1", referrerId: "referrer-1" }),
      },
    });
    await onPaymentReferralCredit(tx as never, "user-a", 0, "pay-ref", "category", DEFAULT_SETTINGS);
    expect(tx.wallet.update).not.toHaveBeenCalled();
  });

  it("clamps REFERRAL_WORKER_PAYMENT_PCT to [0, 100]", async () => {
    const tx = makeTx({
      referral: {
        findFirst: jest.fn().mockResolvedValue({ id: "ref1", referrerId: "referrer-1" }),
      },
    });
    await onPaymentReferralCredit(tx as never, "user-a", 1000, "pay-ref", "category", {
      ...DEFAULT_SETTINGS,
      REFERRAL_WORKER_PAYMENT_PCT: "150",   // should be clamped to 100
    });
    const updateCall = (tx.wallet.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.balance.increment).toBe(1000); // max 100%
  });
});

// ── VIEWER referral: 30% locked on quiz entry ────────────────────
describe("onViewerQuizEntry — viewer 30% locked bonus", () => {
  it("skips when referrer === referred (self-referral guard)", async () => {
    const tx = makeTx();
    await onViewerQuizEntry(tx as never, "user-a", "user-a", 500, "sess-1", DEFAULT_SETTINGS);
    expect(tx.referral.upsert).not.toHaveBeenCalled();
  });

  it("creates a LOCKED earning of 30% of the entry fee", async () => {
    const tx = makeTx();
    await onViewerQuizEntry(tx as never, "referrer-1", "viewer-1", 500, "sess-1", DEFAULT_SETTINGS);
    // lockedBonus = Math.round(500 * 30 / 100) = 150
    const createCall = (tx.referralEarning.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.amount).toBe(150);
    expect(createCall.data.source).toBe("VIEWER_QUIZ_LOCKED");
  });

  it("respects a custom REFERRAL_VIEWER_PCT setting", async () => {
    const tx = makeTx();
    await onViewerQuizEntry(tx as never, "referrer-1", "viewer-1", 500, "sess-1", {
      ...DEFAULT_SETTINGS,
      REFERRAL_VIEWER_PCT: "10",
    });
    const createCall = (tx.referralEarning.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.amount).toBe(50); // Math.round(500 * 10/100)
  });

  it("does not create a zero-amount earning", async () => {
    const tx = makeTx();
    await onViewerQuizEntry(tx as never, "referrer-1", "viewer-1", 0, "sess-1", DEFAULT_SETTINGS);
    expect(tx.referralEarning.create).not.toHaveBeenCalled();
  });
});

// ── Arithmetic validation (no DB needed) ────────────────────────
describe("referral pct arithmetic", () => {
  const cases: [number, number, number][] = [
    [50,  1000, 500],
    [50,  500,  250],
    [10,  1000, 100],
    [30,  500,  150],
    [50,  1,    1],    // minimum non-zero
    [50,  0,    0],    // zero payment
  ];

  it.each(cases)(
    "pct=%i amountPaid=%i → bonus=%i",
    (pct, paid, expected) => {
      expect(Math.round(paid * pct / 100)).toBe(expected);
    },
  );
});
