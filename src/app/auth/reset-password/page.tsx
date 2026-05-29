"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setDone(true);
      } else {
        setError(data.error ?? "Reset failed. Please request a new link.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-red-600 text-sm mb-4">Invalid reset link.</p>
        <Link href="/auth/forgot-password" className="text-primary font-medium hover:underline text-sm">
          Request a new one
        </Link>
      </div>
    );
  }

  return (
    <>
      {done ? (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-text-dark mb-2">Password updated!</h2>
          <p className="text-gray-500 text-sm mb-6">You can now sign in with your new password.</p>
          <Link
            href="/auth/login"
            className="inline-block bg-gold text-text-dark font-bold px-8 py-3 rounded-xl
                       hover:bg-yellow-400 transition-colors text-sm"
          >
            Sign In
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-text-dark">Set new password</h2>
            <p className="text-gray-500 text-sm mt-1">Choose a strong password of at least 8 characters.</p>
          </div>

          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1.5">New password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                           placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1.5">Confirm password</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat new password"
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
              {loading ? "Saving…" : "Reset Password"}
            </button>
          </form>
        </>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <header className="bg-primary px-6 py-5 shadow-md">
        <span className="text-gold text-2xl font-extrabold tracking-tight">BAUIN</span>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-md border border-border max-w-md w-full p-8">
          <Suspense>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
