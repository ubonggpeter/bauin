"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────
interface QuizEntry {
  id:          string;
  totalScore:  number;
  rank:        number | null;
  createdAt:   string;
  quizSession: { id: string; title: string; coverUrl: string | null; entryFee: string; status: string };
}

interface Bet {
  id:          string;
  type:        string;
  stake:       string;
  payout:      string | null;
  status:      string;
  createdAt:   string;
  quizSession: { id: string; title: string; status: string };
}

interface Transaction {
  id:          string;
  type:        string;
  amount:      string;
  description: string;
  status:      string;
  createdAt:   string;
}

interface Stats {
  quizHistory:    QuizEntry[];
  referralCount:  number;
  referralGoal:   number;
  wallet:         { balance: string; totalEarned: string; totalWithdrawn: string };
  bets:           Bet[];
  transactions:   Transaction[];
  role:           string;
}

// ── Helpers ───────────────────────────────────────────────────────
const ngn = (v: string | number) => `₦${Number(v).toLocaleString("en-NG")}`;
const fmt = (d: string) => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-border rounded-2xl px-4 py-4">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-black text-text-dark leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function RankBadge({ rank }: { rank: number | null }) {
  if (!rank) return <span className="text-gray-400 text-xs">—</span>;
  const label = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  return <span className="text-sm font-bold">{label}</span>;
}

// ── Upgrade banner ────────────────────────────────────────────────
function UpgradeBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary-light px-6 py-6 text-white">
      {/* Background decoration */}
      <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
      <div className="absolute right-10 bottom-0 w-20 h-20 bg-white/5 rounded-full translate-y-6" />

      <div className="relative">
        <span className="inline-block bg-gold text-text-dark text-xs font-black px-3 py-1 rounded-full mb-3 tracking-wide uppercase">
          Unlock More
        </span>
        <h3 className="text-xl font-black mb-1 leading-tight">
          Become a Certified Worker
        </h3>
        <p className="text-white/70 text-sm mb-4 max-w-sm">
          Certified workers earn from daily tasks, bigger quiz prizes, 10% lifetime referral commissions, and job marketplace assignments.
        </p>
        <Link href="/auth/register"
          className="inline-flex items-center gap-2 bg-gold text-text-dark font-black text-sm px-6 py-2.5 rounded-full hover:bg-yellow-400 transition-colors shadow-md shadow-gold/20">
          Upgrade now
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

// ── Referral progress card ────────────────────────────────────────
function ReferralCard({ count, goal, referralCode }: { count: number; goal: number; referralCode: string }) {
  const pct  = Math.min(100, Math.round((count / goal) * 100));
  const link = typeof window !== "undefined" ? `${window.location.origin}/auth/register?ref=${referralCode}` : "";
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-white border border-border rounded-2xl px-5 py-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-black text-text-dark text-base">Referral Progress</h3>
          <p className="text-xs text-gray-400 mt-0.5">Refer {goal} people to unlock your earnings</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-black text-primary">{count}</p>
          <p className="text-xs text-gray-400">/ {goal}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      {count >= goal ? (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center mb-4">
          <p className="text-green-700 font-bold text-sm">🎉 Goal reached! Your earnings are unlocked.</p>
        </div>
      ) : (
        <p className="text-xs text-gray-400 mb-4">{goal - count} more referral{goal - count !== 1 ? "s" : ""} to unlock your earnings</p>
      )}

      {/* Copy link */}
      <div className="flex items-center gap-2 bg-gray-50 border border-border rounded-xl px-3 py-2.5">
        <p className="flex-1 text-xs text-gray-500 truncate font-mono">{link}</p>
        <button onClick={copy}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shrink-0 ${
            copied ? "bg-green-100 text-green-700" : "bg-primary text-white hover:bg-primary-dark"
          }`}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function ViewerDashboardPage() {
  const { data: session, status } = useSession();
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<"quiz" | "bets" | "wallet">("quiz");

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/viewer/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return <div className="text-center py-20 text-gray-400">Failed to load stats.</div>;

  const balance       = Number(stats.wallet.balance);
  const totalEarned   = Number(stats.wallet.totalEarned);
  const totalWithdrawn= Number(stats.wallet.totalWithdrawn);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-dark">Welcome back{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}!</h1>
          <p className="text-gray-400 text-sm mt-0.5">Viewer account · <Link href="/auth/register" className="text-primary font-semibold hover:underline">Upgrade to Worker →</Link></p>
        </div>
        <Link href="/wallet"
          className="flex items-center gap-1.5 bg-primary text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-primary-dark transition-colors">
          {ngn(balance)}
        </Link>
      </div>

      {/* Upgrade banner */}
      <UpgradeBanner />

      {/* Referral progress */}
      <ReferralCard
        count={stats.referralCount}
        goal={stats.referralGoal}
        referralCode={session?.user?.referralCode ?? ""}
      />

      {/* Wallet stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Balance"      value={ngn(balance)}        />
        <StatCard label="Total Earned" value={ngn(totalEarned)}    />
        <StatCard label="Withdrawn"    value={ngn(totalWithdrawn)} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {(["quiz", "bets", "wallet"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
              tab === t ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t === "quiz" ? "Quiz History" : t === "bets" ? "Bet History" : "Transactions"}
          </button>
        ))}
      </div>

      {/* ── Quiz history tab ── */}
      {tab === "quiz" && (
        <div className="space-y-3">
          {stats.quizHistory.length === 0 ? (
            <div className="bg-white border border-border rounded-2xl px-6 py-12 text-center">
              <p className="text-3xl mb-3">🎮</p>
              <p className="font-bold text-text-dark mb-1">No quiz history yet</p>
              <p className="text-gray-400 text-sm mb-4">Join a quiz to start earning and building your record.</p>
              <Link href="/dashboard/explore" className="inline-block bg-primary text-white font-bold text-sm px-6 py-2.5 rounded-full hover:bg-primary-dark transition-colors">
                Find Quizzes
              </Link>
            </div>
          ) : (
            stats.quizHistory.map((entry) => (
              <div key={entry.id} className="bg-white border border-border rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M8 21h8M12 17v4M7 4H4a1 1 0 00-1 1v3c0 2.76 1.79 5.1 4.35 5.76C8.12 15.47 9.97 17 12 17s3.88-1.53 4.65-3.24C19.21 13.1 21 10.76 21 8V5a1 1 0 00-1-1h-3"/>
                    <path d="M7 4h10v5a5 5 0 01-10 0V4z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-text-dark text-sm truncate">{entry.quizSession.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmt(entry.createdAt)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-text-dark text-lg">{entry.totalScore}<span className="text-gray-300 text-sm font-normal">/500</span></p>
                  <RankBadge rank={entry.rank} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Bet history tab ── */}
      {tab === "bets" && (
        <div className="space-y-3">
          {stats.bets.length === 0 ? (
            <div className="bg-white border border-border rounded-2xl px-6 py-12 text-center">
              <p className="text-3xl mb-3">🎲</p>
              <p className="font-bold text-text-dark mb-1">No bets placed yet</p>
              <p className="text-gray-400 text-sm">Bet on quiz outcomes to multiply your winnings.</p>
            </div>
          ) : (
            stats.bets.map((bet) => {
              const won  = bet.status === "SETTLED" && bet.payout;
              const lost = bet.status === "SETTLED" && !bet.payout;
              return (
                <div key={bet.id} className="bg-white border border-border rounded-2xl px-5 py-4">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="min-w-0">
                      <p className="font-bold text-text-dark text-sm truncate">{bet.quizSession.title}</p>
                      <p className="text-xs text-gray-400">{bet.type.replace("_", " ")} · {fmt(bet.createdAt)}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                      won  ? "bg-green-100 text-green-700" :
                      lost ? "bg-red-100 text-red-700" :
                             "bg-yellow-100 text-yellow-700"
                    }`}>
                      {won ? "WON" : lost ? "LOST" : bet.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-gray-500">Stake: <strong className="text-text-dark">{ngn(bet.stake)}</strong></span>
                    {bet.payout && <span className="text-xs text-green-600 font-bold">Payout: {ngn(bet.payout)}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Wallet / transactions tab ── */}
      {tab === "wallet" && (
        <div className="space-y-3">
          {stats.transactions.length === 0 ? (
            <div className="bg-white border border-border rounded-2xl px-6 py-12 text-center">
              <p className="text-3xl mb-3">💳</p>
              <p className="font-bold text-text-dark mb-1">No transactions yet</p>
              <p className="text-gray-400 text-sm">Your earnings will appear here.</p>
            </div>
          ) : (
            stats.transactions.map((tx) => {
              const isCredit = ["REFERRAL_BONUS","BET_PAYOUT","DEPOSIT","ACHIEVEMENT_BONUS","LEADERBOARD_PRIZE","JOB_PAYMENT","AFFILIATE_BONUS"].includes(tx.type);
              return (
                <div key={tx.id} className="bg-white border border-border rounded-2xl px-5 py-3.5 flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isCredit ? "bg-green-100" : "bg-red-50"}`}>
                    <span className="text-base">{isCredit ? "+" : "−"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-dark truncate">{tx.description}</p>
                    <p className="text-xs text-gray-400">{tx.type.replace(/_/g, " ")} · {fmt(tx.createdAt)}</p>
                  </div>
                  <p className={`font-black text-base shrink-0 ${isCredit ? "text-green-600" : "text-red-500"}`}>
                    {isCredit ? "+" : "−"}{ngn(tx.amount)}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
