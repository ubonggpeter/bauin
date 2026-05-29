"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );
      if (res.ok) {
        setSent(true);
      } else {
        const d = await res.json();
        setError(d.error ?? "Something went wrong.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <header className="bg-primary px-6 py-5 shadow-md">
        <span className="text-gold text-2xl font-extrabold tracking-tight">BAUIN</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-md border border-border max-w-md w-full p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-text-dark mb-2">Check your email</h2>
              <p className="text-gray-500 text-sm mb-6">
                If <strong>{email}</strong> is registered, you&apos;ll receive a password reset link shortly.
                The link expires in 1 hour.
              </p>
              <Link
                href="/auth/login"
                className="text-primary font-medium text-sm hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-text-dark">Forgot your password?</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              {error && (
                <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm
                               focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                               placeholder-gray-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gold text-text-dark font-bold py-3 rounded-xl
                             hover:bg-yellow-400 transition-colors disabled:opacity-60 text-sm"
                >
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Remember it?{" "}
                <Link href="/auth/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
