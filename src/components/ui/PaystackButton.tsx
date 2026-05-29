"use client";

import { useCallback, useMemo } from "react";
import { usePaystackPayment } from "react-paystack";

// ── Types ─────────────────────────────────────────────────────────────────────

type PaymentType = "REGISTRATION" | "QUIZ_ENTRY" | "BET" | "RETRY_FEE" | "TOOL_POOL";

export interface PaystackSuccessResponse {
  reference: string;
  status: string;
  trans: string;
  trxref: string;
  transaction: string;
  message: string;
}

export interface PaystackButtonProps {
  /** Amount in kobo (₦1 = 100 kobo, GH₵1 = 100 pesewas) */
  amount: number;
  email: string;
  /** Payment purpose injected into Paystack metadata */
  paymentType: PaymentType;
  /** Domain-specific metadata forwarded to the webhook handler */
  metadata?: Record<string, unknown>;
  onSuccess: (response: PaystackSuccessResponse) => void;
  onClose?: () => void;
  /** Button label — defaults to the formatted amount */
  label?: string;
  disabled?: boolean;
  /** Extra Tailwind classes (merged onto the teal base) */
  className?: string;
  currency?: string;
  /** Override the Paystack public key (uses env default when omitted) */
  publicKey?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PaystackButton({
  amount,
  email,
  paymentType,
  metadata = {},
  onSuccess,
  onClose,
  label,
  disabled = false,
  className = "",
  currency = "NGN",
  publicKey,
}: PaystackButtonProps) {
  const reference = useMemo(
    () => `BAUIN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    // New reference each mount — ensures idempotent retries within the same session
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [amount, email]
  );

  const config = {
    publicKey: publicKey ?? process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "",
    email,
    amount,
    reference,
    currency,
    metadata: {
      payment_type: paymentType,
      ...metadata,
      // Paystack requires custom_fields to be an array
      custom_fields: [
        { display_name: "Payment Type", variable_name: "payment_type", value: paymentType },
        ...Object.entries(metadata).map(([k, v]) => ({
          display_name: k.replace(/_/g, " "),
          variable_name: k,
          value: String(v),
        })),
      ],
    },
  };

  const initializePayment = usePaystackPayment(config);

  const handleClick = useCallback(() => {
    if (disabled) return;
    initializePayment({
      onSuccess: (response) => onSuccess(response as PaystackSuccessResponse),
      onClose: onClose ?? (() => {}),
    });
  }, [disabled, initializePayment, onSuccess, onClose]);

  const formattedAmount = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount / 100);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={[
        // Base teal style
        "inline-flex items-center justify-center gap-2 font-bold rounded-xl",
        "bg-primary text-white hover:bg-primary-dark active:scale-[0.98]",
        "transition-all duration-150 px-6 py-3 text-sm tracking-wide",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <PaystackIcon />
      {label ?? `Pay ${formattedAmount}`}
    </button>
  );
}

// Small Paystack-branded lock icon
function PaystackIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-4 h-4 opacity-80"
    >
      <path
        fillRule="evenodd"
        d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}
