"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────

type Recruit = {
  id:               string;
  name:             string;
  joinedAt:         string;
  isActive:         boolean;
  inWindow:         boolean;
  totalEarned:      number;
  earningsUnlocked: boolean;
  type:             string;
};

type TreeData = {
  me: {
    id:            string;
    name:          string;
    referralCode:  string;
    joinedAt:      string;
    recruitsCount: number;
    activeCount:   number;
    totalEarned:   number;
  };
  recruits: Recruit[];
};

// ── Helpers ───────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(0)}k`;
  return `₦${n.toLocaleString("en-NG")}`;
}

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return "today";
  if (d < 30)  return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Recruit card (tree node) ──────────────────────────────────────

function RecruitCard({ r }: { r: Recruit }) {
  return (
    <div
      className={`relative bg-white rounded-2xl p-4 shadow-sm text-center w-40 select-none transition-shadow hover:shadow-md border-2 ${
        r.inWindow ? "border-green-400" : "border-gray-200"
      }`}
    >
      {/* Status indicator */}
      <span
        className={`absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full ${
          r.inWindow ? "bg-green-400" : "bg-gray-300"
        }`}
      />

      {/* Avatar */}
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-black mx-auto mb-2"
        style={{ background: r.inWindow ? "#1A6659" : "#9CA3AF" }}
      >
        {initials(r.name)}
      </div>

      {/* Name */}
      <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{daysAgo(r.joinedAt)}</p>

      {/* Earned */}
      {r.totalEarned > 0 && (
        <p className="text-xs font-bold text-green-600 mt-1.5">{fmt(r.totalEarned)}</p>
      )}

      {/* Badge */}
      <span
        className={`mt-2 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          r.inWindow
            ? "bg-green-50 text-green-700"
            : "bg-gray-100 text-gray-400"
        }`}
      >
        {r.inWindow ? "Active" : "Expired"}
      </span>
    </div>
  );
}

// ── Recruit list item (mobile) ────────────────────────────────────

function RecruitListItem({ r }: { r: Recruit }) {
  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-2xl bg-white border-2 shadow-sm ${
        r.inWindow ? "border-green-400" : "border-gray-200"
      }`}
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
        style={{ background: r.inWindow ? "#1A6659" : "#9CA3AF" }}
      >
        {initials(r.name)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Joined {daysAgo(r.joinedAt)} · {r.type}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        {r.totalEarned > 0 && (
          <p className="text-sm font-bold text-green-600">{fmt(r.totalEarned)}</p>
        )}
        <span
          className={`mt-1 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            r.inWindow
              ? "bg-green-50 text-green-700"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {r.inWindow ? "Active" : "Expired"}
        </span>
      </div>
    </div>
  );
}

// ── Tree connectors (desktop) ─────────────────────────────────────
//
// Renders a horizontal crossbar with per-node vertical drops.
// Each flex item owns half the bar to its left and right; the first
// node hides its left half and the last hides its right half.

function TreeRow({ recruits }: { recruits: Recruit[] }) {
  const rowRef = useRef<HTMLDivElement>(null);

  return (
    <div className="overflow-x-auto pb-4">
      <div
        ref={rowRef}
        className="flex mx-auto"
        style={{ width: "fit-content" }}
      >
        {recruits.map((r, i) => {
          const isFirst  = i === 0;
          const isLast   = i === recruits.length - 1;
          const isSingle = recruits.length === 1;

          return (
            <div
              key={r.id}
              className="flex flex-col items-center"
              style={{ minWidth: 176, padding: "0 8px" }}
            >
              {/* Connector segment */}
              <div className="relative w-full" style={{ height: 40 }}>
                {/* Left half of crossbar */}
                {!isSingle && (
                  <div
                    className="absolute top-0 left-0 right-1/2 border-t-2 border-gray-200"
                    style={{ opacity: isFirst ? 0 : 1 }}
                  />
                )}
                {/* Right half of crossbar */}
                {!isSingle && (
                  <div
                    className="absolute top-0 left-1/2 right-0 border-t-2 border-gray-200"
                    style={{ opacity: isLast ? 0 : 1 }}
                  />
                )}
                {/* Vertical drop */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-px border-l-2 border-gray-200" />
              </div>

              <RecruitCard r={r} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function ReferralTreePage() {
  const { status } = useSession();
  const router     = useRouter();
  const [data, setData]       = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<"all" | "active" | "expired">("all");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/login?next=/referrals/tree");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/referrals/tree")
      .then((r) => r.json())
      .then((d: TreeData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { me, recruits } = data;

  const shown = recruits.filter((r) =>
    filter === "active"  ? r.inWindow :
    filter === "expired" ? !r.inWindow :
    true,
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/dashboard/referral"
            className="text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <h1 className="font-black text-gray-900 text-base flex-1">Referral Tree</h1>

          {/* Legend */}
          <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2 border-green-400" />
              Active (&lt;6 months)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2 border-gray-300" />
              Expired
            </span>
          </div>
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div className="max-w-6xl mx-auto px-4 pt-6 grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Total recruits", value: me.recruitsCount, color: "text-gray-900" },
          { label: "Active", value: me.activeCount, color: "text-green-600" },
          { label: "Expired", value: me.recruitsCount - me.activeCount, color: "text-gray-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── DESKTOP: tree view ─────────────────────────────────────── */}
      <div className="hidden md:block max-w-6xl mx-auto px-4 pt-8">

        {/* Filter pills */}
        <div className="flex justify-center gap-2 mb-6">
          {(["all", "active", "expired"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all capitalize ${
                filter === f
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white text-gray-500 border border-gray-200 hover:border-primary/50"
              }`}
            >
              {f === "all" ? `All (${me.recruitsCount})` :
               f === "active" ? `Active (${me.activeCount})` :
               `Expired (${me.recruitsCount - me.activeCount})`}
            </button>
          ))}
        </div>

        {/* Root node */}
        <div className="flex justify-center">
          <div className="bg-primary rounded-2xl px-6 py-4 shadow-lg text-white text-center min-w-[200px] max-w-xs">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-black mx-auto mb-2">
              {initials(me.name)}
            </div>
            <p className="font-black text-lg leading-tight">{me.name}</p>
            <p className="text-xs text-white/60 mt-0.5">You</p>
            <div className="flex justify-center gap-4 mt-3 text-xs">
              <div>
                <span className="font-black text-green-300">{me.activeCount}</span>
                <span className="text-white/50"> active</span>
              </div>
              <div>
                <span className="font-black text-white/40">{me.recruitsCount - me.activeCount}</span>
                <span className="text-white/50"> expired</span>
              </div>
              {me.totalEarned > 0 && (
                <div>
                  <span className="font-black text-gold">{fmt(me.totalEarned)}</span>
                  <span className="text-white/50"> earned</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {shown.length > 0 ? (
          <>
            {/* Trunk */}
            <div className="flex justify-center">
              <div className="w-0.5 h-10 bg-gray-300" />
            </div>

            {/* Level-1 label */}
            <div className="flex items-center gap-3 mb-0 px-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] font-semibold text-gray-400 whitespace-nowrap uppercase tracking-widest">
                Level 1 · {shown.length} {shown.length === 1 ? "recruit" : "recruits"}
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <TreeRow recruits={shown} />
          </>
        ) : (
          <EmptyState recruitsCount={me.recruitsCount} referralCode={me.referralCode} />
        )}
      </div>

      {/* ── MOBILE: list view ──────────────────────────────────────── */}
      <div className="md:hidden max-w-md mx-auto px-4 py-6 space-y-3">

        {/* Root user card */}
        <div className="bg-primary rounded-2xl px-5 py-4 text-white flex items-center gap-3 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-base font-black flex-shrink-0">
            {initials(me.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-base truncate">
              {me.name}{" "}
              <span className="text-white/60 font-normal text-xs">(You)</span>
            </p>
            <p className="text-xs text-white/60 mt-0.5">
              {me.activeCount} active · {me.recruitsCount - me.activeCount} expired
              {me.totalEarned > 0 && ` · ${fmt(me.totalEarned)} earned`}
            </p>
          </div>
        </div>

        {/* Legend (mobile only) */}
        <div className="flex items-center gap-4 text-[11px] text-gray-500 px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-green-400" />
            Active (&lt;6 months)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-gray-300" />
            Expired
          </span>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2">
          {(["all", "active", "expired"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all capitalize ${
                filter === f
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white text-gray-500 border border-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <EmptyState recruitsCount={me.recruitsCount} referralCode={me.referralCode} />
        ) : (
          <>
            {/* Divider with count */}
            <div className="flex items-center gap-2 text-xs text-gray-400 px-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span>{shown.length} direct {shown.length === 1 ? "recruit" : "recruits"}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {shown.map((r) => (
              <RecruitListItem key={r.id} r={r} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────

function EmptyState({ recruitsCount, referralCode }: { recruitsCount: number; referralCode: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-5xl mb-4">🌱</p>
      <p className="font-semibold text-gray-700 text-lg">
        {recruitsCount > 0 ? "No recruits match this filter" : "Your tree is empty"}
      </p>
      {recruitsCount === 0 && (
        <p className="text-sm text-gray-400 mt-2">
          Share your code{" "}
          <span className="font-mono font-bold text-primary">{referralCode}</span>{" "}
          to grow your network
        </p>
      )}
    </div>
  );
}
