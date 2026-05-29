"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password. Please try again.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-light">
      {/* Teal header */}
      <header className="bg-primary px-6 py-5 flex items-center justify-between shadow-md">
        <div>
          <span className="text-gold text-2xl font-extrabold tracking-tight">BAUIN</span>
          <span className="ml-3 text-primary-light text-sm hidden sm:inline">
            Billionaires AI Users Income Network
          </span>
        </div>
        <Link
          href="/auth/register"
          className="border border-white/40 text-white text-sm font-medium px-4 py-2
                     rounded-lg hover:bg-primary-dark transition-colors"
        >
          Create account
        </Link>
      </header>

      {/* Form card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-md border border-border w-full max-w-md p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-text-dark">Welcome back</h2>
            <p className="text-gray-500 text-sm mt-1">Sign in to your account to continue</p>
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
                autoComplete="email"
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                           placeholder-gray-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-text-dark">Password</label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                           placeholder-gray-400"
              />
            </div>

            {/* Gold submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-text-dark font-bold py-3 rounded-xl
                         hover:bg-yellow-400 transition-colors disabled:opacity-60
                         text-sm tracking-wide mt-1"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-primary font-semibold hover:underline">
              Register for free
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
