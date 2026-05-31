"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

// ── Types ────────────────────────────────────────────────────────────────────

type Subscription = {
  id:            string;
  sellerId:      string;
  sellerName:    string;
  sellerAvatar:  string | null;
  autoPurchase:  boolean;
  subscribedAt:  string;
  storyCount:    number;
  spendThisMonth: number;
};

type ApiData = {
  subscriptions:       Subscription[];
  totalSpendThisMonth: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function Avatar({ name, avatarUrl, size = 40 }: { name: string; avatarUrl: string | null; size?: number }) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function Toggle({ on, onChange, loading }: { on: boolean; onChange: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={loading}
      aria-label={on ? "Disable auto-purchase" : "Enable auto-purchase"}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
        on ? "bg-primary" : "bg-gray-200"
      } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white border border-border rounded-2xl p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-gray-200 rounded w-32" />
          <div className="h-3 bg-gray-100 rounded w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="h-10 bg-gray-100 rounded-xl" />
        <div className="h-10 bg-gray-100 rounded-xl" />
      </div>
      <div className="h-9 bg-gray-100 rounded-xl" />
    </div>
  );
}

// ── Search panel ─────────────────────────────────────────────────────────────

type SearchUser = { id: string; name: string; email: string; avatarUrl: string | null };

function SubscribeSearch({
  existingIds,
  onSubscribed,
}: {
  existingIds: Set<string>;
  onSubscribed: (sellerId: string) => void;
}) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [busy, setBusy]       = useState(false);
  const [adding, setAdding]   = useState<string | null>(null);

  async function search(q: string) {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/users/search?q=${encodeURIComponent(q.trim())}`);
      const d = await r.json();
      setResults((d.users ?? []).filter((u: SearchUser) => !existingIds.has(u.id)));
    } catch { /* ignore */ }
    setBusy(false);
  }

  async function subscribe(user: SearchUser) {
    setAdding(user.id);
    try {
      const r = await fetch("/api/subscriptions", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ sellerId: user.id }),
      });
      if (r.ok) {
        onSubscribed(user.id);
        setQuery("");
        setResults([]);
      }
    } catch { /* ignore */ }
    setAdding(null);
  }

  return (
    <div className="bg-white border border-border rounded-2xl p-4">
      <p className="text-sm font-bold text-text-dark mb-3">Subscribe to a seller</p>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Search by name…"
          className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary pr-10"
        />
        {busy && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {results.length > 0 && (
        <div className="mt-1 border border-border rounded-xl overflow-hidden shadow-md bg-white">
          {results.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
              <Avatar name={u.name} avatarUrl={u.avatarUrl} size={32} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-dark truncate">{u.name}</p>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
              </div>
              <button
                type="button"
                onClick={() => subscribe(u)}
                disabled={adding === u.id}
                className="text-xs font-bold text-primary hover:text-primary-dark disabled:opacity-50"
              >
                {adding === u.id ? "…" : "Subscribe"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const [data, setData]       = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/subscriptions");
      if (r.ok) setData(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggleAutoPurchase(sub: Subscription) {
    setToggling(sub.sellerId);
    try {
      const r = await fetch(`/api/subscriptions/${sub.sellerId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ autoPurchase: !sub.autoPurchase }),
      });
      if (r.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                subscriptions: prev.subscriptions.map((s) =>
                  s.sellerId === sub.sellerId ? { ...s, autoPurchase: !s.autoPurchase } : s
                ),
              }
            : prev
        );
      }
    } finally {
      setToggling(null);
    }
  }

  async function unsubscribe(sellerId: string) {
    setRemoving(sellerId);
    try {
      const r = await fetch(`/api/subscriptions/${sellerId}`, { method: "DELETE" });
      if (r.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                subscriptions: prev.subscriptions.filter((s) => s.sellerId !== sellerId),
                totalSpendThisMonth:
                  prev.totalSpendThisMonth -
                  (prev.subscriptions.find((s) => s.sellerId === sellerId)?.spendThisMonth ?? 0),
              }
            : prev
        );
      }
    } finally {
      setRemoving(null);
    }
  }

  const existingIds = new Set(data?.subscriptions.map((s) => s.sellerId) ?? []);

  return (
    <div className="min-h-screen bg-bg-light pb-24">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-3 pt-6 pb-2">
          <Link
            href="/dashboard/stories"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Stories
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-text-dark">Subscriptions</span>
        </div>

        <h1 className="text-2xl font-black text-text-dark mt-4 mb-1">Seller Subscriptions</h1>
        <p className="text-sm text-gray-500 mb-6">
          Follow sellers and optionally auto-buy their new stories from your wallet.
        </p>

        {/* Spend summary */}
        {!loading && data && (
          <div className="bg-primary text-white rounded-2xl px-5 py-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-primary-light opacity-80 uppercase tracking-wide mb-0.5">
                Auto-purchase spend this month
              </p>
              <p className="text-2xl font-black">
                ₦{data.totalSpendThisMonth.toLocaleString("en-NG")}
              </p>
            </div>
            <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
          </div>
        )}

        {/* Search to subscribe */}
        <div className="mb-6">
          <SubscribeSearch
            existingIds={existingIds}
            onSubscribed={() => void load()}
          />
        </div>

        {/* List */}
        <div className="flex flex-col gap-4">
          {loading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : data?.subscriptions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-500">No subscriptions yet</p>
              <p className="text-xs text-gray-400 mt-1">Search for a seller above to get started.</p>
            </div>
          ) : (
            data?.subscriptions.map((sub) => (
              <div key={sub.id} className="bg-white border border-border rounded-2xl p-4">
                {/* Seller info */}
                <div className="flex items-center gap-3 mb-4">
                  <Avatar name={sub.sellerName} avatarUrl={sub.sellerAvatar} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-dark truncate">{sub.sellerName}</p>
                    <p className="text-xs text-gray-400">
                      {sub.storyCount} published {sub.storyCount === 1 ? "story" : "stories"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => unsubscribe(sub.sellerId)}
                    disabled={removing === sub.sellerId}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                  >
                    {removing === sub.sellerId ? "…" : "Unsubscribe"}
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-bg-light rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
                      Spend this month
                    </p>
                    <p className="text-sm font-black text-text-dark">
                      ₦{sub.spendThisMonth.toLocaleString("en-NG")}
                    </p>
                  </div>
                  <div className="bg-bg-light rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
                      Subscribed
                    </p>
                    <p className="text-sm font-black text-text-dark">
                      {new Date(sub.subscribedAt).toLocaleDateString("en-NG", {
                        month: "short",
                        day:   "numeric",
                        year:  "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {/* Auto-purchase toggle */}
                <div className="flex items-center justify-between bg-bg-light rounded-xl px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-text-dark">Auto-purchase new stories</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {sub.autoPurchase
                        ? "New stories are bought from your wallet automatically."
                        : "You'll be notified but won't be charged automatically."}
                    </p>
                  </div>
                  <Toggle
                    on={sub.autoPurchase}
                    onChange={() => toggleAutoPurchase(sub)}
                    loading={toggling === sub.sellerId}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
