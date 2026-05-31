"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Apply",
    desc: "Submit your affiliate application. Our team reviews every application manually and responds within 2 business days.",
  },
  {
    step: "2",
    title: "Get your link",
    desc: "Once approved, you receive a unique promo code and referral link to share on any platform.",
  },
  {
    step: "3",
    title: "Earn per sign-up",
    desc: "Every new user who registers via your link earns you ₦2,000 instantly — no caps, no expiry.",
  },
];

const FAQS = [
  {
    q: "How long does approval take?",
    a: "We review every application manually. You'll hear back within 2 business days.",
  },
  {
    q: "Are there limits on how many referrals I can earn from?",
    a: "No limits. Earn ₦2,000 for every valid registration — unlimited referrals.",
  },
  {
    q: "When is the bonus paid?",
    a: "Instantly when the new user completes registration via your link.",
  },
  {
    q: "Can I withdraw my affiliate earnings?",
    a: "Yes. Affiliate bonuses go directly to your BAUIN wallet and follow the standard withdrawal schedule.",
  },
];

type AffStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | null;

interface AffiliateInfo {
  status:          AffStatus;
  promoCode?:      string;
  applicationNote?: string;
  reviewNote?:     string;
}

function StatusBadge({ status }: { status: AffStatus }) {
  if (!status) return null;
  const map: Record<string, string> = {
    PENDING:   "bg-yellow-100 text-yellow-800",
    APPROVED:  "bg-green-100 text-green-800",
    REJECTED:  "bg-red-100 text-red-800",
    SUSPENDED: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold ${map[status] ?? ""}`}>
      {status}
    </span>
  );
}

function ApplicationForm({
  status, onApplied,
}: {
  status: AffStatus;
  onApplied: (s: AffiliateInfo) => void;
}) {
  const [note,    setNote]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/affiliate/apply", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ applicationNote: note }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to submit"); return; }
      onApplied({ status: "PENDING", applicationNote: note });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "PENDING") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-6 py-6 text-center">
        <p className="text-2xl mb-3">⏳</p>
        <p className="font-bold text-yellow-800 text-lg">Application under review</p>
        <p className="text-yellow-700 text-sm mt-1">
          We review every application manually. You&apos;ll hear back within 2 business days.
        </p>
      </div>
    );
  }

  if (status === "APPROVED") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-6 text-center">
        <p className="text-2xl mb-3">✅</p>
        <p className="font-bold text-green-800 text-lg">You&apos;re an approved affiliate!</p>
        <Link href="/dashboard/affiliate"
          className="mt-4 inline-block bg-primary text-white font-black px-6 py-2.5 rounded-full text-sm hover:bg-primary-dark transition-colors">
          Go to Affiliate Dashboard →
        </Link>
      </div>
    );
  }

  if (status === "SUSPENDED") {
    return (
      <div className="bg-gray-100 border border-gray-200 rounded-2xl px-6 py-6 text-center">
        <p className="text-gray-600 font-bold">Your affiliate account is suspended.</p>
        <p className="text-gray-500 text-sm mt-1">Contact support for assistance.</p>
      </div>
    );
  }

  const canApply = !status || status === "REJECTED";

  return (
    <div className="bg-white border border-border rounded-2xl shadow-sm px-6 py-8">
      <h3 className="font-black text-text-dark text-xl mb-1">Apply to become an affiliate</h3>
      <p className="text-gray-500 text-sm mb-6">
        Tell us a little about how you plan to promote BAUIN. All applications are reviewed manually.
      </p>

      {status === "REJECTED" && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          Your previous application was not approved. You may re-apply below.
        </div>
      )}

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-text-dark mb-1.5">
            How do you plan to promote BAUIN? <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="e.g. I have a YouTube channel with 10k subscribers focused on online income..."
            className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !canApply}
          className="w-full bg-primary hover:bg-primary-dark text-white font-black py-3.5 rounded-xl transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20"
        >
          {loading ? "Submitting…" : "Submit Application"}
        </button>

        <p className="text-xs text-gray-400 text-center">
          Applications are reviewed manually — no auto-approvals.
        </p>
      </form>
    </div>
  );
}

export default function AffiliatePage() {
  const { data: session, status: authStatus } = useSession();
  const [affiliate, setAffiliate] = useState<AffiliateInfo | null>(null);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    if (authStatus === "authenticated") {
      setLoading(true);
      fetch("/api/affiliate/status")
        .then((r) => r.json())
        .then((d) => setAffiliate(d.affiliate ?? null))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [authStatus]);

  return (
    <div className="min-h-screen bg-bg-light">
      {/* ── Hero ── */}
      <section className="bg-primary text-white px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <span className="inline-block bg-gold text-text-dark text-xs font-black px-4 py-1.5 rounded-full mb-6 tracking-wide uppercase">
            Affiliate Programme
          </span>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-5">
            Earn <span className="text-gold">₦2,000</span> for every person you refer
          </h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto mb-8">
            Share your unique link. When someone registers on BAUIN through your link,
            you earn an instant bonus — no limits, no expiry.
          </p>
          {authStatus === "unauthenticated" && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/login"
                className="bg-white text-primary font-black px-8 py-3.5 rounded-full hover:bg-gray-50 transition-colors text-sm">
                Sign In to Apply
              </Link>
              <Link href="/auth/register"
                className="bg-gold text-text-dark font-black px-8 py-3.5 rounded-full hover:bg-yellow-400 transition-colors text-sm">
                Create Account
              </Link>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

          {/* Left: How it works + FAQ */}
          <div>
            {/* How it works */}
            <h2 className="text-2xl font-black text-text-dark mb-8">How it works</h2>
            <div className="space-y-6 mb-14">
              {HOW_IT_WORKS.map((item) => (
                <div key={item.step} className="flex gap-5">
                  <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-black text-sm shrink-0 shadow-md shadow-primary/20">
                    {item.step}
                  </div>
                  <div className="pt-1">
                    <h3 className="font-black text-text-dark text-base mb-1">{item.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* FAQ */}
            <h2 className="text-2xl font-black text-text-dark mb-6">FAQ</h2>
            <div className="space-y-5">
              {FAQS.map((faq) => (
                <div key={faq.q} className="bg-white border border-border rounded-xl px-5 py-4">
                  <p className="font-bold text-text-dark text-sm mb-1.5">{faq.q}</p>
                  <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Application form or status */}
          <div className="lg:sticky lg:top-8">
            {authStatus === "loading" || loading ? (
              <div className="bg-white border border-border rounded-2xl px-6 py-10 text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : authStatus === "unauthenticated" ? (
              <div className="bg-white border border-border rounded-2xl shadow-sm px-6 py-10 text-center">
                <p className="text-4xl mb-4">🔒</p>
                <h3 className="font-black text-text-dark text-xl mb-2">Sign in to apply</h3>
                <p className="text-gray-500 text-sm mb-6">
                  You need a BAUIN account to apply for the affiliate programme.
                </p>
                <Link href="/auth/login"
                  className="inline-block bg-primary text-white font-black px-8 py-3 rounded-full text-sm hover:bg-primary-dark transition-colors">
                  Sign In
                </Link>
                <p className="text-xs text-gray-400 mt-4">
                  New here?{" "}
                  <Link href="/auth/register" className="text-primary hover:underline font-semibold">
                    Create an account
                  </Link>
                </p>
              </div>
            ) : (
              <>
                {affiliate && (
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-sm text-gray-500">Your application:</span>
                    <StatusBadge status={affiliate.status ?? null} />
                  </div>
                )}
                <ApplicationForm
                  status={affiliate?.status ?? null}
                  onApplied={(info) => setAffiliate(info)}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <section className="bg-white border-t border-border py-12">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-3 gap-6 text-center">
          {[
            { label: "Bonus per registration", value: "₦2,000" },
            { label: "Referral limit",         value: "Unlimited" },
            { label: "Payment",                value: "Instant" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-black text-primary">{s.value}</p>
              <p className="text-gray-500 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
