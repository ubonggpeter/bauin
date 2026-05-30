"use client";
import { useEffect, useState, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────
type WorkerCard = {
  requestId:      string;
  workerId:       string;
  workerName:     string;
  workerRank:     string;
  accountAgeDays: number;
  totalEarned:    number;
  amount:         number;
  roiPct:         number;
  months:         number;
  description:    string;
  createdAt:      string;
  expectedReturn: number;
};

// ── Rank badge ────────────────────────────────────────────────────
const RANK_COLORS: Record<string, string> = {
  MEMBER:      "bg-gray-100 text-gray-500",
  BRONZE:      "bg-amber-100 text-amber-700",
  SILVER:      "bg-slate-100 text-slate-600",
  GOLD:        "bg-yellow-100 text-yellow-700",
  PLATINUM:    "bg-teal-100 text-teal-700",
  DIAMOND:     "bg-cyan-100 text-cyan-700",
};

function RankBadge({ rank }: { rank: string }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${RANK_COLORS[rank] ?? "bg-gray-100 text-gray-500"}`}>
      {rank}
    </span>
  );
}

// ── Paystack fund modal ───────────────────────────────────────────
function FundModal({ card, onClose, onSuccess }: {
  card: WorkerCard; onClose: () => void; onSuccess: () => void;
}) {
  const [step, setStep]     = useState<"confirm" | "paying" | "verifying" | "done">("confirm");
  const [error, setError]   = useState<string | null>(null);

  function openPaystack() {
    setStep("paying");
    const key = process.env.NEXT_PUBLIC_PAYSTACK_KEY;
    if (!key) {
      // Dev bypass
      handlePaystackSuccess("DEV-" + Math.random().toString(36).slice(2).toUpperCase());
      return;
    }
    const handler = (window as unknown as { PaystackPop: { setup: (cfg: unknown) => { openIframe: () => void } } })
      .PaystackPop.setup({
        key,
        email:     "investor@bauin.com",
        amount:    card.amount * 100,
        currency:  "NGN",
        ref:       `INV-${card.requestId}-${Date.now().toString(36).toUpperCase()}`,
        callback:  (res: { reference: string }) => handlePaystackSuccess(res.reference),
        onClose:   () => setStep("confirm"),
      });
    handler.openIframe();
  }

  async function handlePaystackSuccess(reference: string) {
    setStep("verifying");
    setError(null);
    try {
      const res = await fetch("/api/investments/fund", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ requestId: card.requestId, paystackReference: reference }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Funding failed"); setStep("confirm"); return; }
      setStep("done");
      setTimeout(() => { onSuccess(); }, 2000);
    } catch {
      setError("Network error."); setStep("confirm");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md mx-4 sm:mx-0 p-6 shadow-2xl">
        {step === "done" ? (
          <div className="py-6 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#1A6659" strokeWidth={2.5} className="w-8 h-8">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="font-bold text-text-dark text-lg">Investment Confirmed!</p>
            <p className="text-sm text-gray-500 mt-1">First 25% released to {card.workerName}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-text-dark">Fund This Worker</h3>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Summary */}
            <div className="bg-bg-light rounded-2xl p-4 mb-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {card.workerName.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-text-dark text-sm">{card.workerName}</p>
                  <RankBadge rank={card.workerRank} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white rounded-xl p-2.5">
                  <p className="text-xs text-gray-400">You pay</p>
                  <p className="font-bold text-text-dark text-sm">₦{card.amount.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl p-2.5">
                  <p className="text-xs text-gray-400">ROI</p>
                  <p className="font-bold text-gold">{card.roiPct}%</p>
                </div>
                <div className="bg-white rounded-xl p-2.5">
                  <p className="text-xs text-gray-400">You earn</p>
                  <p className="font-bold text-primary text-sm">₦{card.expectedReturn.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 bg-white rounded-xl p-2.5">
                Escrow: funds released in 4 milestones of 25% over {card.months} months.
                Monthly ROI deducted from worker earnings.
              </p>
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5 mb-4">{error}</p>}

            <button
              onClick={openPaystack}
              disabled={step === "verifying"}
              className="w-full bg-gold text-text-dark font-bold py-3.5 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {step === "verifying" ? (
                <><span className="w-4 h-4 border-2 border-text-dark/30 border-t-text-dark rounded-full animate-spin" />Verifying…</>
              ) : (
                <>Pay ₦{card.amount.toLocaleString()} via Paystack</>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Worker card ───────────────────────────────────────────────────
function WorkerCardComponent({
  card, onFund,
}: { card: WorkerCard; onFund: (c: WorkerCard) => void }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-5 flex flex-col gap-4 hover:border-primary/30 hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
            {card.workerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-text-dark text-sm">{card.workerName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <RankBadge rank={card.workerRank} />
              <span className="text-[10px] text-gray-400">{card.accountAgeDays}d account</span>
            </div>
          </div>
        </div>
        {/* ROI badge — gold */}
        <div className="bg-gold/10 border border-gold/30 rounded-xl px-2.5 py-1.5 text-center flex-shrink-0">
          <p className="text-[10px] text-gold/80 font-medium">ROI</p>
          <p className="text-base font-black text-gold leading-none">{card.roiPct}%</p>
        </div>
      </div>

      {/* Earnings badge */}
      <div className="flex items-center gap-2 bg-primary/5 rounded-xl px-3 py-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="#1A6659" strokeWidth={2} className="w-4 h-4 flex-shrink-0">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
        </svg>
        <span className="text-sm font-semibold text-primary">
          ₦{card.totalEarned.toLocaleString()} total earned
        </span>
      </div>

      {/* Purpose */}
      <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">{card.description}</p>

      {/* Footer stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-bg-light rounded-xl py-2">
          <p className="text-xs text-gray-400">Seeking</p>
          <p className="text-sm font-bold text-text-dark">₦{(card.amount / 1000).toFixed(0)}k</p>
        </div>
        <div className="bg-bg-light rounded-xl py-2">
          <p className="text-xs text-gray-400">Duration</p>
          <p className="text-sm font-bold text-text-dark">{card.months}mo</p>
        </div>
        <div className="bg-bg-light rounded-xl py-2">
          <p className="text-xs text-gray-400">You earn</p>
          <p className="text-sm font-bold text-primary">₦{(card.expectedReturn / 1000).toFixed(0)}k</p>
        </div>
      </div>

      <button
        onClick={() => onFund(card)}
        className="w-full bg-primary text-white text-sm font-bold py-2.5 rounded-xl hover:bg-primary-dark transition-colors"
      >
        Fund This Worker
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────
export default function InvestmentMarketplacePage() {
  const [items, setItems]       = useState<WorkerCard[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sort, setSort]         = useState("earned");
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [funding, setFunding]   = useState<WorkerCard | null>(null);

  const load = useCallback((s: string, p: number) => {
    setLoading(true);
    fetch(`/api/investments/marketplace?sort=${s}&page=${p}&limit=12`)
      .then((r) => r.json())
      .then((json) => {
        setItems(json.items ?? []);
        setTotalPages(json.pagination?.pages ?? 1);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(sort, page); }, [sort, page, load]);

  function handleSortChange(s: string) { setSort(s); setPage(1); }

  return (
    <div className="min-h-screen bg-bg-light">
      {/* Header */}
      <div className="bg-white border-b border-border px-6 py-5">
        <h1 className="text-xl font-bold text-text-dark">Investor Marketplace</h1>
        <p className="text-sm text-gray-500 mt-0.5">Fund workers and earn monthly ROI from their earnings</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Sort bar */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">Sort by:</span>
          {[
            { key: "earned", label: "Highest Earned" },
            { key: "roi",    label: "Highest ROI" },
            { key: "amount", label: "Largest Ask" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => handleSortChange(s.key)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                sort === s.key
                  ? "bg-primary text-white"
                  : "bg-white border border-border text-gray-500 hover:border-primary/40"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl py-20 text-center">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#1A6659" strokeWidth={2} className="w-7 h-7">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No investment requests available</p>
            <p className="text-gray-400 text-sm mt-1">Check back soon — new workers apply regularly.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {items.map((card) => (
                <WorkerCardComponent key={card.requestId} card={card} onFund={setFunding} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium border border-border rounded-xl disabled:opacity-40 hover:bg-white transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-sm text-gray-500 px-2">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-medium border border-border rounded-xl disabled:opacity-40 hover:bg-white transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Fund modal */}
      {funding && (
        <FundModal
          card={funding}
          onClose={() => setFunding(null)}
          onSuccess={() => { setFunding(null); load(sort, page); }}
        />
      )}
    </div>
  );
}
