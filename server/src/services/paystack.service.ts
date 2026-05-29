/**
 * Thin wrapper around the Paystack REST API (v1).
 * Uses Node.js 22 built-in fetch — no extra runtime dependency.
 */

const BASE = "https://api.paystack.co";

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY ?? ""}`,
    "Content-Type": "application/json",
  };
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers as Record<string, string>) },
  });
  const json = (await res.json()) as { status: boolean; message: string; data: T };
  if (!json.status) throw new Error(`Paystack: ${json.message}`);
  return json.data;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InitializePaymentParams {
  email: string;
  /** Amount in kobo (₦1 = 100 kobo) */
  amount: number;
  reference?: string;
  callback_url?: string;
  metadata?: Record<string, unknown>;
  channels?: string[];
  currency?: string;
}

export interface InitializePaymentResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackTransactionData {
  id: number;
  status: string;
  reference: string;
  /** Amount in kobo */
  amount: number;
  paid_at: string;
  currency: string;
  customer: { email: string; id: number };
  metadata: Record<string, unknown>;
  authorization: {
    authorization_code: string;
    channel: string;
    last4: string;
    bank: string;
    card_type: string;
  };
}

export interface CreateRecipientParams {
  type: "nuban" | "mobile_money" | "basa" | "ghipss";
  name: string;
  account_number: string;
  bank_code: string;
  currency?: string;
  description?: string;
}

export interface CreateRecipientResult {
  active: boolean;
  recipient_code: string;
  type: string;
  name: string;
  account_number: string;
}

export interface InitiateTransferParams {
  source: "balance";
  /** Amount in kobo */
  amount: number;
  recipient: string;
  reason?: string;
  reference?: string;
  currency?: string;
}

export interface InitiateTransferResult {
  transfer_code: string;
  status: string;
  reference: string;
  amount: number;
}

// ── Service functions ─────────────────────────────────────────────────────────

export function initializePayment(
  params: InitializePaymentParams
): Promise<InitializePaymentResult> {
  return call<InitializePaymentResult>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function verifyPayment(reference: string): Promise<PaystackTransactionData> {
  return call<PaystackTransactionData>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export function createTransferRecipient(
  params: CreateRecipientParams
): Promise<CreateRecipientResult> {
  return call<CreateRecipientResult>("/transferrecipient", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function initiateTransfer(
  params: InitiateTransferParams
): Promise<InitiateTransferResult> {
  return call<InitiateTransferResult>("/transfer", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
