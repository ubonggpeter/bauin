/**
 * Shared E2E helpers.
 * Backend (Express)  → BACKEND constant (default localhost:4000)
 * Frontend (Next.js) → page.request / relative paths (baseURL localhost:3000)
 */
import { type Page, type APIRequestContext, expect } from "@playwright/test";
import * as crypto from "crypto";

export const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? "test-paystack-secret";

// ── Seeded test accounts ──────────────────────────────────────────────────────
export const CREDS = {
  worker1: { email: "worker1@bauin.com", password: "Worker@2025!" },
  seller1: { email: "seller1@bauin.com", password: "Seller@2025!" },
  dist1:   { email: "dist1@bauin.com",   password: "Dist@2025!" },
  admin:   { email: "admin@bauin.com",   password: "Admin@2025!" },
} as const;

// ── UI helpers ────────────────────────────────────────────────────────────────

/** Sign in via the Next.js login page and wait for dashboard redirect. */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.getByPlaceholder(/you@example\.com/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
}

// ── Express-backend API helpers ───────────────────────────────────────────────

/** Authenticate against the Express backend; returns JWT + user. */
export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<{ token: string; user: Record<string, unknown> }> {
  const res = await request.post(`${BACKEND}/api/auth/login`, {
    data: { email, password },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return { token: body.token as string, user: body.user as Record<string, unknown> };
}

/** Register a new user via the Express backend and return their token. */
export async function apiRegister(
  request: APIRequestContext,
  opts: {
    name: string;
    email: string;
    phone: string;
    password: string;
    referral_code?: string;
  },
): Promise<{ token: string; user: Record<string, unknown> }> {
  const res = await request.post(`${BACKEND}/api/auth/register`, { data: opts });
  expect(res.status()).toBe(201);
  const body = await res.json();
  return { token: body.token as string, user: body.user as Record<string, unknown> };
}

/**
 * POST a fake charge.success event to the Express webhook endpoint.
 * Computes HMAC-SHA512 so that verifyWebhookSignature() passes.
 *
 * The webhook uses express.raw({ type:"*\/*" }) which captures the body as
 * a Buffer regardless of Content-Type, so we send raw bytes.
 */
export async function simulatePaystackWebhook(
  request: APIRequestContext,
  payload: {
    reference: string;
    amount: number;        // kobo
    email: string;
    metadata: Record<string, unknown>;
  },
): Promise<void> {
  const event = {
    event: "charge.success",
    data: {
      reference: payload.reference,
      amount:    payload.amount,
      currency:  "NGN",
      status:    "success",
      paid_at:   new Date().toISOString(),
      channel:   "card",
      customer:  { email: payload.email },
      metadata:  payload.metadata,
    },
  };

  const body = JSON.stringify(event);
  const sig  = crypto.createHmac("sha512", PAYSTACK_SECRET).update(body).digest("hex");

  const res = await request.post(`${BACKEND}/api/payments/webhook`, {
    headers: {
      "Content-Type":         "application/octet-stream",
      "x-paystack-signature": sig,
    },
    data: Buffer.from(body),
  });
  // Webhook always returns 200 immediately; async processing follows
  expect(res.status()).toBe(200);
  await new Promise<void>((r) => setTimeout(r, 1800));
}

/** Unique email tag per test run to avoid collisions. */
export function uniqueEmail(tag = "u") {
  return `e2e-${tag}-${Date.now()}@test.bauin.local`;
}

// ── Phase-interaction helpers (quiz play page) ────────────────────────────────

/**
 * Phase 1 — Flash Cards
 * Cards auto-advance every 3 s. Wait for the phase-result overlay.
 */
export async function waitForPhase1(page: Page, maxCards = 20) {
  // Each card ≈ 3 s + buffer; outer timeout is per-test
  await expect(page.getByRole("button", {
    name: /next phase|see results|phase 2|2 of 5/i,
  })).toBeVisible({ timeout: (maxCards * 3 + 10) * 1000 });
}

/**
 * Phase 2 — Memory Match
 * Click all "?" buttons in pairs; wait for phase-result overlay.
 * The locked timeout after a mismatch is 900 ms; we wait 1.2 s between pairs.
 */
export async function completePhase2(page: Page) {
  const hiddenBtn = () => page.getByRole("button").filter({ hasText: "?" });

  for (let attempt = 0; attempt < 60; attempt++) {
    const count = await hiddenBtn().count();
    if (count === 0) break;

    // Reveal first hidden card
    const first = hiddenBtn().first();
    if (await first.isEnabled({ timeout: 1200 }).catch(() => false)) {
      await first.click();
    }
    await page.waitForTimeout(350);

    // Reveal second hidden card
    const second = hiddenBtn().first();
    if (await second.isEnabled({ timeout: 1200 }).catch(() => false)) {
      await second.click();
    }

    // Wait for match resolution (900 ms lock + buffer)
    await page.waitForTimeout(1200);
  }

  // Wait for phase-result overlay
  await expect(page.getByRole("button", {
    name: /next phase|see results|phase 3|3 of 5/i,
  })).toBeVisible({ timeout: 20_000 });
}

/**
 * Phase 3 — Sequence (drag-to-order, tap-to-swap)
 * Submit the order as-is; scoring is server-side.
 */
export async function completePhase3(page: Page) {
  const submitBtn = page.getByRole("button", { name: /submit|check/i });
  await expect(submitBtn).toBeVisible({ timeout: 10_000 });
  await submitBtn.click();
  await expect(page.getByRole("button", {
    name: /next phase|see results|phase 4|4 of 5/i,
  })).toBeVisible({ timeout: 10_000 });
}

/**
 * Phase 4 — Fill-Gap (30-second timer per question)
 * Click the first option for each question; the phase auto-advances when all done.
 */
export async function completePhase4(page: Page) {
  for (let q = 0; q < 15; q++) {
    const opts = page.locator("button").filter({ hasText: /^[A-Z].{0,60}$/ }).first();
    const visible = await opts.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!visible) break;
    await opts.click();
    await page.waitForTimeout(1200);
  }
  await expect(page.getByRole("button", {
    name: /next phase|see results|phase 5|5 of 5/i,
  })).toBeVisible({ timeout: 30_000 });
}

/**
 * Phase 5 — True / False (5-second timer per question)
 * Click "True" for every statement; phase ends automatically.
 */
export async function completePhase5(page: Page) {
  for (let q = 0; q < 20; q++) {
    const trueBtn = page.getByRole("button", { name: /^true$/i });
    const visible = await trueBtn.isVisible({ timeout: 8_000 }).catch(() => false);
    if (!visible) break;
    const enabled = await trueBtn.isEnabled().catch(() => false);
    if (!enabled) {
      await page.waitForTimeout(1000);
      continue;
    }
    await trueBtn.click();
    await page.waitForTimeout(950);
  }
  await expect(page.getByRole("button", {
    name: /next phase|see results/i,
  })).toBeVisible({ timeout: 20_000 });
}
