"use client";
import { useEffect, useState, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────
type Pool = {
  id:            string;
  name:          string;
  description:   string | null;
  website:       string | null;
  monthlyCost:   number;
  capacity:      number;
  memberCount:   number;
  costPerMember: number;
  status:        string;
  ownerName:     string;
  isOwner:       boolean;
  isJoined:      boolean;
  nextRenewalAt: string | null;
};

// ── Progress bar ──────────────────────────────────────────────────
function MemberBar({ count, capacity }: { count: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min((count / capacity) * 100, 100) : 0;
  const full = count >= capacity;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={full ? "text-red-400 font-medium" : "text-gray-400"}>
          {count} / {capacity} members{full ? " · Full" : ""}
        </span>
        <span className="text-gray-400">{Math.round(pct)}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${full ? "bg-red-400" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Pool card ─────────────────────────────────────────────────────
function PoolCard({
  pool, onJoin, onLeave, joining,
}: {
  pool: Pool;
  onJoin: (p: Pool) => void;
  onLeave: (p: Pool) => void;
  joining: string | null;
}) {
  const isBusy = joining === pool.id;

  return (
    <div className={`bg-white border rounded-2xl p-5 flex flex-col gap-4 transition-all hover:shadow-md ${
      pool.isJoined || pool.isOwner ? "border-primary/30" : "border-border"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-text-dark truncate">{pool.name}</h3>
            {pool.isOwner && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-gold/10 text-gold rounded-full">OWNER</span>
            )}
            {pool.status === "PENDING_APPROVAL" && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full">PENDING</span>
            )}
          </div>
          {pool.website && (
            <a
              href={pool.website.startsWith("http") ? pool.website : `https://${pool.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline mt-0.5 block truncate"
            >
              {pool.website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
        {/* Cost per member — gold */}
        <div className="bg-gold/10 border border-gold/30 rounded-xl px-3 py-2 text-center flex-shrink-0">
          <p className="text-[10px] text-gold/80 font-medium">per member</p>
          <p className="font-black text-gold text-base leading-none">
            ₦{pool.costPerMember.toLocaleString()}
          </p>
          <p className="text-[10px] text-gold/60">/month</p>
        </div>
      </div>

      {pool.description && (
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{pool.description}</p>
      )}

      {/* Member progress bar — teal */}
      <MemberBar count={pool.memberCount} capacity={pool.capacity} />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-bg-light rounded-xl py-2">
          <p className="text-xs text-gray-400">Total cost</p>
          <p className="text-sm font-bold text-text-dark">₦{pool.monthlyCost.toLocaleString()}/mo</p>
        </div>
        <div className="bg-bg-light rounded-xl py-2">
          <p className="text-xs text-gray-400">By</p>
          <p className="text-sm font-semibold text-text-dark truncate px-1">{pool.ownerName}</p>
        </div>
      </div>

      {/* Action button */}
      {!pool.isOwner && (
        pool.isJoined ? (
          <button
            onClick={() => onLeave(pool)}
            className="w-full border border-border text-gray-500 text-sm font-medium py-2.5 rounded-xl hover:border-red-300 hover:text-red-500 transition-colors"
          >
            Leave Pool
          </button>
        ) : (
          <button
            onClick={() => onJoin(pool)}
            disabled={isBusy || pool.memberCount >= pool.capacity}
            className="w-full bg-primary text-white text-sm font-bold py-2.5 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isBusy
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Joining…</>
              : pool.memberCount >= pool.capacity ? "Pool Full" : "Join Pool"
            }
          </button>
        )
      )}
    </div>
  );
}

// ── Create pool modal ─────────────────────────────────────────────
function CreatePoolModal({
  onClose, onCreated,
}: { onClose: () => void; onCreated: () => void }) {
  const [name, setName]         = useState("");
  const [website, setWebsite]   = useState("");
  const [description, setDesc]  = useState("");
  const [cost, setCost]         = useState("");
  const [capacity, setCapacity] = useState(10);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const monthlyCost = Number(cost);
    if (!monthlyCost || monthlyCost < 100) { setError("Monthly cost must be at least ₦100"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/pools", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, website: website || undefined, description: description || undefined, monthlyCost, capacity }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to create pool"); return; }
      onCreated();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md mx-4 sm:mx-0 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-text-dark text-lg">Create Tool Pool</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Tool name */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
              Tool / Service Name *
            </label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ChatGPT Plus, Notion, Figma Pro"
              className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-bg-light focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>

          {/* Website */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
              Website <span className="text-gray-300 normal-case font-normal">(optional)</span>
            </label>
            <input
              type="url" value={website} onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-bg-light focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
              Description <span className="text-gray-300 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={description} onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="What is this tool for? Who should join?"
              className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-bg-light focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Monthly cost */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
              Monthly Cost (₦) *
            </label>
            <input
              type="number" value={cost} onChange={(e) => setCost(e.target.value)}
              placeholder="e.g. 20000" min={100} step={1}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-bg-light focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>

          {/* Max members */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Max Members *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary">{capacity}</span>
                {Number(cost) > 0 && (
                  <span className="text-xs text-gold font-semibold">
                    ≈ ₦{Math.ceil(Number(cost) / capacity).toLocaleString()}/member
                  </span>
                )}
              </div>
            </div>
            <div className="relative h-2 bg-gray-200 rounded-full">
              <div
                className="absolute left-0 top-0 h-2 bg-primary rounded-full pointer-events-none"
                style={{ width: `${((capacity - 2) / 98) * 100}%` }}
              />
              <input
                type="range" min={2} max={100} step={1} value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full shadow pointer-events-none"
                style={{ left: `calc(${((capacity - 2) / 98) * 100}% - 8px)` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-300 mt-1">
              <span>2</span><span>100</span>
            </div>
          </div>

          {/* Preview */}
          {Number(cost) > 0 && (
            <div className="bg-gradient-to-r from-primary/5 to-gold/5 rounded-xl p-3 flex items-center justify-between text-sm">
              <div>
                <p className="text-xs text-gray-400">Cost per member</p>
                <p className="font-black text-gold">₦{Math.ceil(Number(cost) / capacity).toLocaleString()}<span className="text-xs font-normal text-gray-400">/mo</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Platform fee (5%)</p>
                <p className="font-semibold text-text-dark">₦{Math.round(Math.ceil(Number(cost) / capacity) * 0.05).toLocaleString()}</p>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

          <button
            type="submit" disabled={loading || !name.trim()}
            className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? "Creating…" : "Create Pool"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Leave confirm modal ───────────────────────────────────────────
function LeaveModal({ pool, onClose, onLeft }: {
  pool: Pool; onClose: () => void; onLeft: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    await fetch(`/api/pools/${pool.id}/leave`, { method: "POST" });
    onLeft();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl">
        <h3 className="font-bold text-text-dark mb-2">Leave "{pool.name}"?</h3>
        <p className="text-sm text-gray-500 mb-5">You will lose access immediately. No refund for the current month.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-border text-gray-500 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={confirm} disabled={loading}
            className="flex-1 bg-red-500 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? "Leaving…" : "Leave Pool"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────
export default function PoolsPage() {
  const [pools, setPools]       = useState<Pool[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joining, setJoining]   = useState<string | null>(null);
  const [leavingPool, setLeavingPool] = useState<Pool | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const loadPools = useCallback(() => {
    setLoading(true);
    fetch("/api/pools")
      .then((r) => r.json())
      .then((j) => setPools(j.pools ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadPools(); }, [loadPools]);

  async function handleJoin(pool: Pool) {
    setJoinError(null);
    setJoining(pool.id);
    try {
      const res = await fetch(`/api/pools/${pool.id}/join`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { setJoinError(json.error ?? "Failed to join"); }
      else { loadPools(); }
    } catch {
      setJoinError("Network error.");
    } finally {
      setJoining(null);
    }
  }

  const myPools  = pools.filter((p) => p.isJoined || p.isOwner);
  const allPools = pools.filter((p) => !p.isJoined && !p.isOwner);

  return (
    <div className="min-h-screen bg-bg-light">
      {/* Header */}
      <div className="bg-white border-b border-border px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-dark">Tool Pools</h1>
          <p className="text-sm text-gray-500 mt-0.5">Share subscription costs with other BAUIN members</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-primary-dark transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create Pool
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {joinError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {joinError}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* My pools */}
            {myPools.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">My Pools</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myPools.map((p) => (
                    <PoolCard key={p.id} pool={p} onJoin={handleJoin} onLeave={setLeavingPool} joining={joining} />
                  ))}
                </div>
              </section>
            )}

            {/* Available pools */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {allPools.length > 0 ? "Available Pools" : "All Pools"}
              </h2>
              {allPools.length === 0 && myPools.length === 0 ? (
                <div className="bg-white border border-border rounded-2xl py-20 text-center">
                  <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#1A6659" strokeWidth={2} className="w-7 h-7">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">No pools yet</p>
                  <p className="text-gray-400 text-sm mt-1">Create the first one to start sharing costs.</p>
                </div>
              ) : allPools.length === 0 ? (
                <p className="text-sm text-gray-400 bg-white border border-border rounded-2xl px-5 py-4">
                  You've joined all available pools.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allPools.map((p) => (
                    <PoolCard key={p.id} pool={p} onJoin={handleJoin} onLeave={setLeavingPool} joining={joining} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {showCreate && (
        <CreatePoolModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadPools(); }}
        />
      )}

      {leavingPool && (
        <LeaveModal
          pool={leavingPool}
          onClose={() => setLeavingPool(null)}
          onLeft={() => { setLeavingPool(null); loadPools(); }}
        />
      )}
    </div>
  );
}
