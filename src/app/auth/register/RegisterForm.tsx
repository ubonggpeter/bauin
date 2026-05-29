"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const BENEFITS = [
  "AI-powered income streams working 24/7",
  "Multi-level referral rewards up to 5 levels deep",
  "Real-time earnings dashboard & analytics",
  "Exclusive learning content & certification",
  "Investment opportunities with tracked returns",
  "Instant wallet with withdrawal support",
];

interface Props {
  initialRef: string;
}

export default function RegisterForm({ initialRef }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    referral_code: initialRef,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const hasReferral = form.referral_code.trim().length > 0;

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed. Please try again.");
        return;
      }
      setDone(true);
      // Redirect after short delay so user sees success
      setTimeout(() => router.push("/auth/login"), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md border border-border max-w-md w-full p-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-text-dark mb-2">Account created!</h2>
          <p className="text-gray-500 text-sm">
            We sent a verification link to <strong>{form.email}</strong>.
            Check your inbox and verify your email to unlock full access.
          </p>
          <p className="text-xs text-gray-400 mt-4">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ── Left teal panel ─────────────────────────────────────────── */}
      <aside className="bg-primary md:w-5/12 lg:w-2/5 flex flex-col justify-between px-10 py-12 text-white">
        <div>
          <div className="mb-10">
            <h1 className="text-4xl font-extrabold tracking-tight">
              <span className="text-gold">BAUIN</span>
            </h1>
            <p className="text-primary-light text-sm mt-1 font-medium">
              Billionaires AI Users Income Network
            </p>
          </div>

          <h2 className="text-2xl font-bold leading-snug mb-8">
            Build your fortune with the network that rewards growth
          </h2>

          <ul className="space-y-4">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-3">
                {/* Gold tick */}
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
                  <svg className="w-3 h-3 text-text-dark" fill="none" viewBox="0 0 12 12" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2 6l3 3 5-5" />
                  </svg>
                </span>
                <span className="text-sm text-white/90 leading-snug">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom decorative quote */}
        <blockquote className="mt-12 border-l-2 border-gold pl-4 text-sm text-white/60 italic hidden md:block">
          "The best time to join the BAUIN network is today."
        </blockquote>
      </aside>

      {/* ── Right white form ─────────────────────────────────────────── */}
      <main className="flex-1 bg-white flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {/* Referral detected banner */}
          {hasReferral && (
            <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 text-green-800
                            rounded-xl px-4 py-3">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806
                         3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438
                         3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806
                         3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138
                         3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946
                         3.42 3.42 0 013.138-3.138z" />
              </svg>
              <p className="text-sm font-medium">
                Referral code <span className="font-bold font-mono">{form.referral_code}</span> applied!
                You&apos;re joining via a member invite.
              </p>
            </div>
          )}

          <h2 className="text-2xl font-bold text-text-dark mb-1">Create your account</h2>
          <p className="text-gray-500 text-sm mb-8">
            Already have one?{" "}
            <Link href="/auth/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>

          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={set("name")}
                placeholder="John Doe"
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                           placeholder-gray-400"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={set("email")}
                placeholder="you@example.com"
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                           placeholder-gray-400"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1.5">Phone number</label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={set("phone")}
                placeholder="+1 555 000 0000"
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                           placeholder-gray-400"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={set("password")}
                placeholder="Min 8 characters"
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                           placeholder-gray-400"
              />
            </div>

            {/* Referral code */}
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1.5">
                Referral code
                <span className="ml-1 text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.referral_code}
                onChange={set("referral_code")}
                placeholder="8-character code"
                maxLength={8}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm font-mono uppercase
                            focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                            placeholder-gray-400 tracking-widest
                            ${hasReferral ? "border-green-300 bg-green-50 text-green-800" : "border-border"}`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-bold py-3 rounded-xl
                         hover:bg-primary-dark transition-colors disabled:opacity-60
                         text-sm tracking-wide mt-2"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            By creating an account you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  );
}
