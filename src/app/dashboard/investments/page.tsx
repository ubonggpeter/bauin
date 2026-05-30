"use client";
import { useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────
type EligibilityData = {
  eligible:   boolean;
  reasons:    string[];
  checks: {
    active:    boolean;
    kycOk:     boolean;
    ageOk:     boolean;
    ageDays:   number;
    noOpen:    boolean;
  };
  openRequest?: { id: string; status: string; amount: number; roiPct: number; months: number; description: string };
};

// ── Slider ────────────────────────────────────────────────────────
function Slider({
  label, min, max, step, value, onChange, format,
}: {
  label: string; min: number; max: number; step: number;
  value: number; onChange: (v: number) => void; format: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
        <span className="text-sm font-bold text-primary">{format(value)}</span>
      </div>
      <div className="relative h-2 bg-gray-200 rounded-full">
        <div
          className="absolute left-0 top-0 h-2 bg-primary rounded-full pointer-events-none"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full shadow pointer-events-none"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
    </div>
  );
}

// ── Eligibility card ──────────────────────────────────────────────
function EligibilityCard({ data }: { data: EligibilityData }) {
  const { checks } = data;
  const items = [
    { label: "Account active",          ok: checks.active },
    { label: "KYC not rejected",        ok: checks.kycOk },
    { label: `Account age (${checks.ageDays} days / 30 required)`, ok: checks.ageOk },
    { label: "No pending request",      ok: checks.noOpen },
  ];

  return (
    <div className={`rounded-2xl border p-5 ${data.eligible
      ? "border-primary/30 bg-primary/5"
      : "border-amber-300/40 bg-amber-50/60"}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          data.eligible ? "bg-primary text-white" : "bg-amber-400 text-white"
        }`}>
          {data.eligible
            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5"><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          }
        </div>
        <div>
          <p className="font-semibold text-text-dark text-sm">
            {data.eligible ? "You are eligible to request investment" : "Not yet eligible"}
          </p>
          {!data.eligible && data.reasons.length > 0 && (
            <p className="text-xs text-amber-700 mt-0.5">{data.reasons[0]}</p>
          )}
        </div>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2.5 text-sm">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
              item.ok ? "bg-primary/15 text-primary" : "bg-gray-200 text-gray-400"
            }`}>
              {item.ok ? "✓" : "○"}
            </span>
            <span className={item.ok ? "text-text-dark" : "text-gray-400"}>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Active request card ───────────────────────────────────────────
function ActiveRequest({ req }: { req: NonNullable<EligibilityData["openRequest"]> }) {
  const statusColor = req.status === "APPROVED" ? "text-primary bg-primary/10" : "text-amber-600 bg-amber-50";
  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text-dark text-sm">Your Investment Request</h3>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>
          {req.status}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-bg-light rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">Amount</p>
          <p className="font-bold text-text-dark text-sm mt-0.5">₦{req.amount.toLocaleString()}</p>
        </div>
        <div className="bg-bg-light rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">ROI</p>
          <p className="font-bold text-gold text-sm mt-0.5">{req.roiPct}%</p>
        </div>
        <div className="bg-bg-light rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">Duration</p>
          <p className="font-bold text-text-dark text-sm mt-0.5">{req.months}mo</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 line-clamp-2">{req.description}</p>
      {req.status === "APPROVED" && (
        <p className="text-xs text-primary mt-2 font-medium">✓ Live on investor marketplace</p>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────
export default function InvestmentRequestPage() {
  const [elig, setElig]         = useState<EligibilityData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]   = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  // Form state
  const [amount, setAmount]   = useState(50_000);
  const [roiPct, setRoiPct]   = useState(10);
  const [months, setMonths]   = useState(12);
  const [purpose, setPurpose] = useState("");

  useEffect(() => {
    fetch("/api/investments/eligibility")
      .then((r) => r.json())
      .then(setElig)
      .finally(() => setLoading(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/investments/request", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ amount, description: purpose, roiPct, months }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Submission failed"); return; }
      setSuccess(json.message ?? "Request submitted!");
      // Refresh eligibility
      fetch("/api/investments/eligibility").then((r) => r.json()).then(setElig);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const expectedReturn = Math.round(amount * roiPct / 100);

  return (
    <div className="min-h-screen bg-bg-light">
      {/* Header */}
      <div className="bg-white border-b border-border px-6 py-5">
        <h1 className="text-xl font-bold text-text-dark">Request Investment</h1>
        <p className="text-sm text-gray-500 mt-0.5">Get funding from investors in the BAUIN network</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Eligibility card */}
            {elig && <EligibilityCard data={elig} />}

            {/* Active request */}
            {elig?.openRequest && <ActiveRequest req={elig.openRequest} />}

            {/* Request form */}
            {elig?.eligible && !elig.openRequest && !success && (
              <div className="bg-white border border-border rounded-2xl p-6">
                <h2 className="font-semibold text-text-dark mb-5">Investment Request Details</h2>
                <form onSubmit={submit} className="space-y-6">
                  {/* Amount */}
                  <Slider
                    label="Amount Needed"
                    min={10_000} max={500_000} step={5_000}
                    value={amount} onChange={setAmount}
                    format={(v) => `₦${v.toLocaleString()}`}
                  />

                  {/* ROI + Months */}
                  <div className="grid grid-cols-2 gap-4">
                    <Slider
                      label="Investor ROI %"
                      min={5} max={20} step={0.5}
                      value={roiPct} onChange={setRoiPct}
                      format={(v) => `${v}%`}
                    />
                    <Slider
                      label="Duration (months)"
                      min={1} max={24} step={1}
                      value={months} onChange={setMonths}
                      format={(v) => `${v}mo`}
                    />
                  </div>

                  {/* Summary bar */}
                  <div className="bg-gradient-to-r from-primary/8 to-gold/8 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Investor earns</p>
                      <p className="font-black text-gold text-lg">₦{expectedReturn.toLocaleString()}</p>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5} className="w-5 h-5">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">You receive</p>
                      <p className="font-black text-primary text-lg">₦{amount.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Purpose */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                      Purpose <span className="text-gray-300 normal-case">({purpose.length}/500)</span>
                    </label>
                    <textarea
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value.slice(0, 500))}
                      rows={4}
                      placeholder="Describe what you will use this investment for and how you plan to repay via earnings…"
                      className="w-full px-4 py-3 border border-border rounded-xl text-sm text-text-dark bg-bg-light focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                    {purpose.trim().length > 0 && purpose.trim().length < 20 && (
                      <p className="text-xs text-red-400 mt-1">At least 20 characters required</p>
                    )}
                  </div>

                  {error && (
                    <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || purpose.trim().length < 20}
                    className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
                  >
                    {submitting ? "Submitting…" : "Submit Investment Request"}
                  </button>
                </form>
              </div>
            )}

            {/* Success state */}
            {success && (
              <div className="bg-white border border-primary/20 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#1A6659" strokeWidth={2.5} className="w-7 h-7">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <p className="font-bold text-text-dark text-lg mb-2">Request Submitted!</p>
                <p className="text-sm text-gray-500">{success}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
