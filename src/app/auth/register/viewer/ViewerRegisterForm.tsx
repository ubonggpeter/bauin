"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Props {
  initialRef:    string;
  affiliateCode: string;
  quizScore:     number | null;
}

const INPUT = "w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors placeholder-gray-400";

export default function ViewerRegisterForm({ initialRef, affiliateCode, quizScore }: Props) {
  const router  = useRouter();
  const [form,  setFormState] = useState({ name: "", email: "", phone: "", password: "", ref: initialRef });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [done,  setDone]      = useState(false);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormState((p) => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.password) {
      setError("All fields are required"); return;
    }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setError(""); setLoading(true);
    try {
      const res  = await fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:          form.name,
          email:         form.email,
          phone:         form.phone,  // backend field name
          password:      form.password,
          referralCode:  form.ref || undefined,
          affiliateCode: affiliateCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.message ?? data.error ?? "Registration failed"); return; }
      setDone(true);
      setTimeout(() => router.push("/auth/login?callbackUrl=/dashboard/viewer"), 3500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-border max-w-sm w-full p-10 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-text-dark mb-2">Account created!</h2>
          <p className="text-gray-500 text-sm mb-1">Check your email to verify your account.</p>
          <p className="text-gray-400 text-xs">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-light flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white font-black text-base leading-none">B</span>
          </div>
          <div>
            <span className="font-black text-xl text-text-dark leading-none">BAUIN</span>
            <p className="text-[9px] text-gray-400 leading-none tracking-widest uppercase mt-0.5">AI Income Network</p>
          </div>
        </div>

        {/* Quiz score banner */}
        {quizScore !== null && (
          <div className="mb-6 bg-gradient-to-r from-primary to-primary-light text-white rounded-2xl px-5 py-4 text-center">
            <p className="text-gold text-xs font-bold uppercase tracking-widest mb-1">Your score</p>
            <p className="text-4xl font-black">{quizScore}<span className="text-white/50 text-xl">/500</span></p>
            <p className="text-white/70 text-sm mt-1">Create an account to save this result and earn from future wins.</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-border px-6 py-8">
          <h2 className="text-2xl font-black text-text-dark mb-1">Create free account</h2>
          <p className="text-gray-500 text-sm mb-6">
            Join as a Viewer — it&apos;s free.{" "}
            <Link href="/auth/register" className="text-primary font-semibold hover:underline">
              Worker account →
            </Link>
          </p>

          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-text-dark mb-1.5">Full Name</label>
              <input type="text" required value={form.name} onChange={set("name")}
                placeholder="John Doe" className={INPUT} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-dark mb-1.5">Email Address</label>
              <input type="email" required value={form.email} onChange={set("email")}
                placeholder="you@example.com" className={INPUT} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-dark mb-1.5">Phone Number</label>
              <input type="tel" required value={form.phone} onChange={set("phone")}
                placeholder="+234 800 000 0000" className={INPUT} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-dark mb-1.5">Password</label>
              <input type="password" required minLength={8} value={form.password} onChange={set("password")}
                placeholder="Minimum 8 characters" className={INPUT} />
            </div>
            {form.ref && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-800">
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Referral code <span className="font-mono font-black tracking-widest">{form.ref.toUpperCase()}</span> applied
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full mt-2 bg-primary hover:bg-primary-dark text-white font-black py-3.5 rounded-xl transition-colors text-sm shadow-md shadow-primary/20 disabled:opacity-50">
              {loading ? "Creating account…" : "Create free account"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-5">
            Already a member?{" "}
            <Link href="/auth/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </div>

        {/* What viewers get */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: "🎮", label: "Play quizzes" },
            { icon: "🔗", label: "Earn referrals" },
            { icon: "💳", label: "Free wallet" },
          ].map((f) => (
            <div key={f.label} className="bg-white border border-border rounded-xl py-4">
              <p className="text-2xl mb-1">{f.icon}</p>
              <p className="text-xs font-semibold text-gray-600">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
