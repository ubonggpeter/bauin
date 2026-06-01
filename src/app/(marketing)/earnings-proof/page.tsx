"use client";

import { animate, motion, useInView } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { EarningsProofData } from "@/app/api/earnings-proof/route";

// ── Counter hook ──────────────────────────────────────────────────────────────

function useCountUp(target: number, active: boolean, duration = 2.8) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active || target === 0) return;
    const ctrl = animate(0, target, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setCount(Math.floor(v)),
    });
    return ctrl.stop;
  }, [active, target, duration]);
  return count;
}

// ── Naira formatter ───────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `₦${(n / 1_000_000).toFixed(2)}M`;
  return `₦${n.toLocaleString("en-NG")}`;
}

function fmtFull(n: number) {
  return `₦${n.toLocaleString("en-NG")}`;
}

// ── Category accent colours ───────────────────────────────────────────────────

const ACCENT: Record<string, { ring: string; glow: string; bar: string; text: string }> = {
  jobs:      { ring: "ring-teal-500/40",   glow: "bg-teal-500/10",   bar: "bg-teal-500",   text: "text-teal-400"   },
  stories:   { ring: "ring-purple-500/40", glow: "bg-purple-500/10", bar: "bg-purple-500", text: "text-purple-400" },
  quiz:      { ring: "ring-amber-500/40",  glow: "bg-amber-500/10",  bar: "bg-amber-500",  text: "text-amber-400"  },
  referrals: { ring: "ring-green-500/40",  glow: "bg-green-500/10",  bar: "bg-green-500",  text: "text-green-400"  },
  betting:   { ring: "ring-orange-500/40", glow: "bg-orange-500/10", bar: "bg-orange-500", text: "text-orange-400" },
};

// ── Components ────────────────────────────────────────────────────────────────

function AnimatedTotal({ total }: { total: number }) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const count  = useCountUp(total, inView, 3);
  return (
    <div ref={ref} className="text-center">
      <div className="inline-flex items-center gap-2 bg-teal-900/40 border border-teal-700/50 rounded-full px-4 py-1.5 mb-8">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-teal-300 text-xs font-bold tracking-widest uppercase">Live Platform Total</span>
      </div>
      <h1 className="text-lg text-gray-400 font-medium mb-3">Total Paid to Workers</h1>
      <div className="text-6xl sm:text-7xl lg:text-8xl font-black text-white tracking-tight leading-none mb-2">
        {count === 0 && total === 0
          ? "₦0"
          : `₦${count.toLocaleString("en-NG")}`}
      </div>
      <p className="text-gray-500 text-sm">and counting — refreshes every 5 minutes</p>
    </div>
  );
}

function CategoryCard({
  keyName,
  label,
  icon,
  amount,
  total,
  index,
  active,
}: {
  keyName: string;
  label: string;
  icon: string;
  amount: number;
  total: number;
  index: number;
  active: boolean;
}) {
  const pct   = total > 0 ? (amount / total) * 100 : 0;
  const count = useCountUp(amount, active, 2 + index * 0.15);
  const acc   = ACCENT[keyName] ?? ACCENT.jobs;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={active ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: 0.2 + index * 0.1, duration: 0.55, ease: "easeOut" }}
      className={`relative rounded-2xl p-6 border border-white/8 bg-white/5 backdrop-blur-sm ring-1 ${acc.ring} overflow-hidden`}
    >
      {/* Glow blob */}
      <div className={`absolute -top-10 -right-10 w-36 h-36 rounded-full ${acc.glow} blur-2xl pointer-events-none`} />

      <div className="flex items-start justify-between mb-5">
        <div>
          <span className="text-3xl">{icon}</span>
          <p className="text-gray-300 font-semibold mt-2">{label}</p>
        </div>
        <span className={`text-xs font-bold ${acc.text} bg-white/5 px-2 py-1 rounded-full`}>
          {pct.toFixed(1)}%
        </span>
      </div>

      <div className={`text-2xl sm:text-3xl font-black ${acc.text} mb-4`}>
        {fmtFull(count)}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${acc.bar}`}
          initial={{ width: 0 }}
          animate={active ? { width: `${pct}%` } : {}}
          transition={{ delay: 0.4 + index * 0.1, duration: 1.2, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EarningsProofPage() {
  const [data, setData]       = useState<EarningsProofData | null>(null);
  const [loading, setLoading] = useState(true);

  const sectionRef = useRef<HTMLDivElement>(null);
  const inView     = useInView(sectionRef, { once: true, margin: "-80px" });

  useEffect(() => {
    fetch("/api/earnings-proof")
      .then((r) => r.json())
      .then((d: EarningsProofData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total     = data?.total ?? 0;
  const breakdown = data?.breakdown ?? [];
  const updatedAt = data?.updatedAt ? new Date(data.updatedAt) : null;

  return (
    <div className="min-h-screen bg-[#070F0D]">
      {/* ── Navigation ── */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
            <span className="text-[#070F0D] font-black text-sm">B</span>
          </div>
          <span className="text-white font-bold text-lg">BAUIN</span>
        </Link>
        <Link
          href="/auth/register"
          className="bg-amber-400 text-[#070F0D] font-bold text-sm px-5 py-2 rounded-full hover:bg-amber-300 transition-colors"
        >
          Join & Earn
        </Link>
      </nav>

      {/* ── Hero counter ── */}
      <section className="pt-16 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="text-center">
              <div className="text-5xl font-black text-white/20 animate-pulse">₦ —</div>
            </div>
          ) : (
            <AnimatedTotal total={total} />
          )}
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="max-w-4xl mx-auto px-4 mb-12">
        <div className="h-px bg-gradient-to-r from-transparent via-teal-700/60 to-transparent" />
      </div>

      {/* ── Breakdown grid ── */}
      <section ref={sectionRef} className="pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-teal-400 text-xs font-bold uppercase tracking-widest">Breakdown</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">Earnings by Category</h2>
            <p className="text-gray-500 text-sm mt-2">
              All figures are aggregated platform totals — no individual earnings data is exposed.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {breakdown.map((b, i) => (
                <CategoryCard
                  key={b.key}
                  keyName={b.key}
                  label={b.label}
                  icon={b.icon}
                  amount={b.amount}
                  total={total}
                  index={i}
                  active={inView}
                />
              ))}
            </div>
          )}

          {updatedAt && (
            <p className="text-center text-gray-600 text-xs mt-8">
              Last updated: {updatedAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
        </div>
      </section>

      {/* ── Summary bar ── */}
      {!loading && total > 0 && (
        <section className="pb-12 px-4">
          <div className="max-w-3xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-center text-gray-400 text-sm mb-5">Share of total payout</p>
            <div className="flex h-4 rounded-full overflow-hidden gap-px">
              {breakdown.map((b) => {
                const pct = total > 0 ? (b.amount / total) * 100 : 0;
                const acc = ACCENT[b.key] ?? ACCENT.jobs;
                return pct > 0 ? (
                  <div
                    key={b.key}
                    className={`${acc.bar} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${b.label}: ${fmt(b.amount)} (${pct.toFixed(1)}%)`}
                  />
                ) : null;
              })}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 justify-center">
              {breakdown.map((b) => {
                const acc = ACCENT[b.key] ?? ACCENT.jobs;
                return (
                  <div key={b.key} className="flex items-center gap-1.5 text-xs text-gray-400">
                    <div className={`w-2.5 h-2.5 rounded-sm ${acc.bar}`} />
                    <span>{b.icon} {b.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="py-16 px-4 text-center border-t border-white/5">
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
          Your share is waiting
        </h2>
        <p className="text-gray-400 text-sm mb-8 max-w-sm mx-auto">
          Join thousands of verified BAUIN workers and start earning from jobs, quizzes, referrals, and more.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/auth/register"
            className="bg-amber-400 text-[#070F0D] font-black px-8 py-3.5 rounded-full text-sm hover:bg-amber-300 transition-colors"
          >
            Join BAUIN — It&apos;s Free
          </Link>
          <Link
            href="/"
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </section>

      {/* ── Disclaimer ── */}
      <footer className="pb-10 px-4 text-center">
        <p className="text-gray-700 text-xs max-w-lg mx-auto">
          Figures shown are aggregated totals across all BAUIN workers and do not represent any single user&apos;s earnings.
          Individual earnings vary based on activity, category, and referral network.
          Data refreshes every 5 minutes.
        </p>
      </footer>
    </div>
  );
}
