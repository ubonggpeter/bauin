"use client";

import { useState, useTransition } from "react";
import { adminSignIn } from "./actions";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Step = "credentials" | "totp";

interface FieldErrors {
  email?: string;
  password?: string;
  totpCode?: string;
  general?: string;
}

export function AdminLoginForm() {
  const [step, setStep] = useState<Step>("credentials");
  const [challengeId, setChallengeId] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();

  // ── Step 1: email + password ──────────────────────────────────────────────

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const res = await fetch(`${API}/api/admin/auth/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).catch(() => null);

    if (!res) {
      setErrors({ general: "Unable to reach server. Please try again." });
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      setErrors({ general: data.error ?? "Login failed" });
      return;
    }

    if (!data.requiresTwoFactor) {
      // 2FA not enabled — sign in directly
      startTransition(() => adminSignIn(data.adminToken));
      return;
    }

    setChallengeId(data.challengeId);
    setStep("totp");
  }

  // ── Step 2: TOTP code ─────────────────────────────────────────────────────

  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    if (!/^\d{6}$/.test(totpCode)) {
      setErrors({ totpCode: "Enter the 6-digit code from your authenticator app" });
      return;
    }

    const res = await fetch(`${API}/api/admin/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, totpCode }),
    }).catch(() => null);

    if (!res) {
      setErrors({ general: "Unable to reach server. Please try again." });
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      if (data.error?.toLowerCase().includes("expired")) {
        // Challenge expired — restart from credentials
        setStep("credentials");
        setTotpCode("");
        setChallengeId("");
        setErrors({ general: "Session expired. Please log in again." });
      } else {
        setErrors({ totpCode: data.error ?? "Invalid code" });
      }
      return;
    }

    startTransition(() => adminSignIn(data.adminToken));
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F5F7F6] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">

          {/* Teal header */}
          <div className="bg-[#1A6659] px-8 py-7">
            <h1 className="text-3xl font-black text-[#F0B429] tracking-widest font-serif">
              BAUIN
            </h1>
            <p className="text-[#2B8A72] text-xs mt-1 tracking-wide">
              Admin Portal
            </p>
          </div>

          {/* Form area */}
          <div className="px-8 py-8">

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              <StepDot active={step === "credentials"} done={step === "totp"} label="1" />
              <div className="flex-1 h-px bg-gray-200" />
              <StepDot active={step === "totp"} done={false} label="2" />
            </div>

            <h2 className="text-xl font-bold text-[#1A1A2E] mb-1">
              {step === "credentials" ? "Sign in to Admin" : "Two-factor verification"}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {step === "credentials"
                ? "Enter your admin credentials to continue."
                : "Enter the 6-digit code from your authenticator app."}
            </p>

            {/* General error */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-700">
                {errors.general}
              </div>
            )}

            {/* ── Credentials form ───────────────────────────────────────── */}
            {step === "credentials" && (
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A2E] mb-1">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="admin@bauin.app"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm
                               focus:outline-none focus:ring-2 focus:ring-[#1A6659] focus:border-transparent"
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1A1A2E] mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm
                               focus:outline-none focus:ring-2 focus:ring-[#1A6659] focus:border-transparent"
                  />
                  {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-[#F0B429] hover:bg-amber-400 disabled:opacity-60
                             text-[#1A1A2E] font-bold py-3 rounded-lg text-sm
                             transition-colors duration-150"
                >
                  {isPending ? "Signing in…" : "Continue"}
                </button>
              </form>
            )}

            {/* ── TOTP form ──────────────────────────────────────────────── */}
            {step === "totp" && (
              <form onSubmit={handleTotpSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A2E] mb-1">
                    Authentication code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    required
                    autoFocus
                    placeholder="000000"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-2xl
                               text-center font-mono tracking-widest
                               focus:outline-none focus:ring-2 focus:ring-[#1A6659] focus:border-transparent"
                  />
                  {errors.totpCode && (
                    <p className="mt-1 text-xs text-red-600">{errors.totpCode}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isPending || totpCode.length < 6}
                  className="w-full bg-[#F0B429] hover:bg-amber-400 disabled:opacity-60
                             text-[#1A1A2E] font-bold py-3 rounded-lg text-sm
                             transition-colors duration-150"
                >
                  {isPending ? "Verifying…" : "Verify & Sign in"}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep("credentials"); setTotpCode(""); setErrors({}); }}
                  className="w-full text-sm text-[#1A6659] hover:underline"
                >
                  ← Back to login
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          BAUIN Platform Admin Portal · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

// ── Small helper components ───────────────────────────────────────────────────

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  const bg = done
    ? "bg-[#1A6659] text-white"
    : active
    ? "bg-[#F0B429] text-[#1A1A2E]"
    : "bg-gray-200 text-gray-400";
  return (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  transition-colors duration-200 ${bg}`}
    >
      {done ? "✓" : label}
    </div>
  );
}
