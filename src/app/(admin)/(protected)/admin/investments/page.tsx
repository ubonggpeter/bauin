"use client";
import { useCallback, useEffect, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type InvestmentRequest = {
  id:          string;
  amount:      string;
  roiPct:      string;
  months:      number;
  description: string | null;
  status:      string;
  createdAt:   string;
  user: { id: string; name: string | null; email: string | null; createdAt: string };
};

type Investment = {
  id:             string;
  amount:         string;
  roiPct:         string;
  months:         number;
  escrowBalance:  string;
  releasedAmount: string;
  milestonesPaid: number;
  lastRoiPaidAt:  string | null;
  lastActivityAt: string | null;
  frozenAt:       string | null;
  isFrozen:       boolean;
  maturityDate:   string;
  status:         string;
  actualReturn:   string | null;
  maturedAt:      string | null;
  createdAt:      string;
  user:   { id: string; name: string | null; email: string | null };
  worker: { id: string; name: string | null; email: string | null };
};

type Settings = Record<string, string>;

const SETTING_LABELS: Record<string, string> = {
  INVESTMENT_MIN_AMOUNT:           "Minimum Amount (₦)",
  INVESTMENT_MAX_AMOUNT:           "Maximum Amount (₦)",
  INVESTMENT_AUTO_APPROVE_LIMIT:   "Auto-Approve Limit (₦)",
  INVESTMENT_PLATFORM_FEE_PCT:     "Platform Fee (%)",
  INVESTMENT_MIN_ROI_PCT:          "Minimum ROI (%)",
  INVESTMENT_MAX_ROI_PCT:          "Maximum ROI (%)",
  INVESTMENT_MIN_MONTHS:           "Minimum Duration (months)",
  INVESTMENT_MAX_MONTHS:           "Maximum Duration (months)",
  INVESTMENT_MIN_ACCOUNT_AGE_DAYS: "Minimum Account Age (days)",
};

const AUTO_APPROVE_LIMIT = 200_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `₦${n.toLocaleString()}`;
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function EscrowBar({ milestonesPaid }: { milestonesPaid: number }) {
  return (
    <div className="flex gap-1 mt-1">
      {[1, 2, 3, 4].map((m) => (
        <div
          key={m}
          className={`h-2 flex-1 rounded-full ${m <= milestonesPaid ? "bg-green-500" : "bg-gray-600"}`}
        />
      ))}
    </div>
  );
}

// ── Tab: Pending ──────────────────────────────────────────────────────────────

function PendingTab() {
  const [requests, setRequests] = useState<InvestmentRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  // Approve modal state
  const [approveTarget, setApproveTarget] = useState<InvestmentRequest | null>(null);
  const [approveNote,   setApproveNote]   = useState("");

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<InvestmentRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/investments/pending");
      const data = await res.json();
      setRequests(data.requests ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function approve(req: InvestmentRequest, note?: string) {
    setBusy(req.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/investments/requests/${req.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Approve failed");
        return;
      }
      setApproveTarget(null);
      setApproveNote("");
      void load();
    } finally {
      setBusy(null);
    }
  }

  async function reject(req: InvestmentRequest, reason: string) {
    setBusy(req.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/investments/requests/${req.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Reject failed");
        return;
      }
      setRejectTarget(null);
      setRejectReason("");
      void load();
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div>
      {error && <p className="mb-3 text-red-400 text-sm">{error}</p>}
      {requests.length === 0 ? (
        <p className="text-gray-500">No pending investment requests.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const amount     = Number(req.amount);
            const isLarge    = amount > AUTO_APPROVE_LIMIT;
            const isBusy     = busy === req.id;
            return (
              <div key={req.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex flex-wrap justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-white">
                      {req.user.name ?? "Unknown"}{" "}
                      <span className="text-gray-400 text-sm font-normal">{req.user.email}</span>
                    </p>
                    <p className="text-sm text-gray-400">
                      Requested {fmtDate(req.createdAt)} · Account since {fmtDate(req.user.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{fmt(amount)}</p>
                    <p className="text-sm text-gray-400">{req.roiPct}% ROI · {req.months}mo</p>
                  </div>
                </div>
                {req.description && (
                  <p className="text-sm text-gray-300 mb-3">{req.description}</p>
                )}
                {isLarge && (
                  <p className="text-xs text-amber-400 mb-2">
                    ⚠ Amount exceeds ₦{AUTO_APPROVE_LIMIT.toLocaleString()} — manual review note required
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    disabled={isBusy}
                    onClick={() => {
                      if (isLarge) {
                        setApproveTarget(req);
                      } else {
                        void approve(req);
                      }
                    }}
                    className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-md"
                  >
                    {isBusy ? "…" : "Approve"}
                  </button>
                  <button
                    disabled={isBusy}
                    onClick={() => setRejectTarget(req)}
                    className="px-3 py-1.5 text-sm bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-md"
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approve with note modal */}
      {approveTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="font-semibold text-white mb-1">Approve Investment Request</h3>
            <p className="text-sm text-gray-400 mb-4">
              {fmt(Number(approveTarget.amount))} — {approveTarget.user.name}
            </p>
            <label className="block text-sm text-gray-300 mb-1">Review Note (required for large amounts)</label>
            <textarea
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
              rows={3}
              placeholder="Add a note about your approval decision…"
              className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-white mb-4 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setApproveTarget(null); setApproveNote(""); }}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={!approveNote.trim() || busy === approveTarget.id}
                onClick={() => void approve(approveTarget, approveNote)}
                className="px-4 py-2 text-sm bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-md"
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="font-semibold text-white mb-1">Reject Investment Request</h3>
            <p className="text-sm text-gray-400 mb-4">
              {fmt(Number(rejectTarget.amount))} — {rejectTarget.user.name}
            </p>
            <label className="block text-sm text-gray-300 mb-1">Reason (required)</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Explain why this request is being rejected…"
              className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-white mb-4 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={!rejectReason.trim() || busy === rejectTarget.id}
                onClick={() => void reject(rejectTarget, rejectReason)}
                className="px-4 py-2 text-sm bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-md"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Active ───────────────────────────────────────────────────────────────

function ActiveTab() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [busy, setBusy]               = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/investments/active");
      const data = await res.json();
      setInvestments(data.investments ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function releaseMilestone(inv: Investment) {
    setBusy(inv.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/investments/${inv.id}/release-milestone`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Release failed");
        return;
      }
      void load();
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div>
      {error && <p className="mb-3 text-red-400 text-sm">{error}</p>}
      {investments.length === 0 ? (
        <p className="text-gray-500">No active investments.</p>
      ) : (
        <div className="space-y-4">
          {investments.map((inv) => {
            const amount        = Number(inv.amount);
            const escrow        = Number(inv.escrowBalance);
            const released      = Number(inv.releasedAmount);
            const roiPaid       = released - amount;
            const isBusy        = busy === inv.id;
            const canRelease    = inv.milestonesPaid < 4 && escrow > 0;
            return (
              <div key={inv.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex flex-wrap justify-between gap-2 mb-3">
                  <div>
                    <p className="font-semibold text-white">
                      Investor: {inv.user.name ?? "—"}{" "}
                      <span className="text-gray-400 text-sm font-normal">{inv.user.email}</span>
                    </p>
                    <p className="text-sm text-gray-400">
                      Worker: {inv.worker.name ?? "—"} · Started {fmtDate(inv.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{fmt(amount)}</p>
                    <p className="text-sm text-gray-400">
                      {inv.roiPct}% ROI · {inv.months}mo · Matures {fmtDate(inv.maturityDate)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                  <div className="bg-gray-900 rounded p-2">
                    <p className="text-gray-400 text-xs mb-0.5">Escrow</p>
                    <p className="font-semibold text-white">{fmt(escrow)}</p>
                  </div>
                  <div className="bg-gray-900 rounded p-2">
                    <p className="text-gray-400 text-xs mb-0.5">Released</p>
                    <p className="font-semibold text-white">{fmt(released)}</p>
                  </div>
                  <div className="bg-gray-900 rounded p-2">
                    <p className="text-gray-400 text-xs mb-0.5">ROI Paid</p>
                    <p className={`font-semibold ${roiPaid > 0 ? "text-green-400" : "text-gray-400"}`}>
                      {roiPaid > 0 ? fmt(roiPaid) : "—"}
                    </p>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-1">
                    Milestones: {inv.milestonesPaid}/4 · Last ROI {fmtDate(inv.lastRoiPaidAt)}
                  </p>
                  <EscrowBar milestonesPaid={inv.milestonesPaid} />
                </div>

                <button
                  disabled={isBusy || !canRelease}
                  onClick={() => void releaseMilestone(inv)}
                  className="px-3 py-1.5 text-sm bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white rounded-md"
                >
                  {isBusy ? "Releasing…" : "Force Release Milestone"}
                </button>
                {inv.milestonesPaid >= 4 && (
                  <span className="ml-2 text-xs text-green-400">All milestones paid</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab: Completed ────────────────────────────────────────────────────────────

function CompletedTab() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    fetch("/api/admin/investments/completed")
      .then((r) => r.json())
      .then((d) => setInvestments(d.investments ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div>
      {investments.length === 0 ? (
        <p className="text-gray-500">No completed investments.</p>
      ) : (
        <div className="space-y-4">
          {investments.map((inv) => (
            <div key={inv.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">
                    {inv.user.name ?? "—"}{" "}
                    <span className="text-gray-400 text-sm font-normal">{inv.user.email}</span>
                  </p>
                  <p className="text-sm text-gray-400">
                    Worker: {inv.worker.name ?? "—"} ·{" "}
                    {inv.status === "MATURED" ? `Matured ${fmtDate(inv.maturedAt)}` : "Cancelled"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{fmt(Number(inv.amount))}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      inv.status === "MATURED"
                        ? "bg-green-900 text-green-300"
                        : "bg-red-900 text-red-300"
                    }`}
                  >
                    {inv.status}
                  </span>
                </div>
              </div>
              {inv.actualReturn != null && (
                <p className="text-sm text-gray-400 mt-2">
                  Actual return: <span className="text-green-400">{fmt(Number(inv.actualReturn))}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Disputed ─────────────────────────────────────────────────────────────

function DisputedTab() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [busy, setBusy]               = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/investments/disputed");
      const data = await res.json();
      setInvestments(data.investments ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function unfreeze(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/investments/${id}/unfreeze`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Unfreeze failed");
        return;
      }
      void load();
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div>
      {error && <p className="mb-3 text-red-400 text-sm">{error}</p>}
      {investments.length === 0 ? (
        <p className="text-gray-500">No disputed investments.</p>
      ) : (
        <div className="space-y-4">
          {investments.map((inv) => (
            <div key={inv.id} className="bg-gray-800 rounded-lg p-4 border border-red-900">
              <div className="flex flex-wrap justify-between gap-2 mb-3">
                <div>
                  <p className="font-semibold text-white">
                    {inv.user.name ?? "—"}{" "}
                    <span className="text-gray-400 text-sm font-normal">{inv.user.email}</span>
                  </p>
                  <p className="text-sm text-gray-400">
                    Worker: {inv.worker.name ?? "—"} · Frozen {fmtDate(inv.frozenAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{fmt(Number(inv.amount))}</p>
                  <p className="text-sm text-red-400">FROZEN</p>
                </div>
              </div>
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1">
                  Escrow: {fmt(Number(inv.escrowBalance))} · Milestones: {inv.milestonesPaid}/4
                </p>
                <EscrowBar milestonesPaid={inv.milestonesPaid} />
              </div>
              <button
                disabled={busy === inv.id}
                onClick={() => void unfreeze(inv.id)}
                className="px-3 py-1.5 text-sm bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white rounded-md"
              >
                {busy === inv.id ? "Unfreezing…" : "Unfreeze"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Settings ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const [settings, setSettings] = useState<Settings>({});
  const [draft,    setDraft]    = useState<Settings>({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [message,  setMessage]  = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/investments/settings")
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.settings ?? {});
        setDraft(d.settings ?? {});
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const body: Record<string, number> = {};
      for (const [k, v] of Object.entries(draft)) {
        body[k] = Number(v);
      }
      const res = await fetch("/api/admin/investments/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        setMessage(d.error ?? "Save failed");
        return;
      }
      setSettings({ ...draft });
      setMessage("Settings saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-400">Loading…</p>;

  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);

  return (
    <div className="max-w-lg">
      {message && (
        <p className={`mb-4 text-sm ${message === "Settings saved." ? "text-green-400" : "text-red-400"}`}>
          {message}
        </p>
      )}
      <div className="space-y-4">
        {Object.keys(SETTING_LABELS).map((key) => (
          <div key={key}>
            <label className="block text-sm text-gray-300 mb-1">{SETTING_LABELS[key]}</label>
            <input
              type="number"
              min={0}
              value={draft[key] ?? ""}
              onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-white"
            />
          </div>
        ))}
      </div>
      <button
        disabled={saving || !isDirty}
        onClick={() => void save()}
        className="mt-6 px-5 py-2 text-sm bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white rounded-md"
      >
        {saving ? "Saving…" : "Save Settings"}
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "pending" | "active" | "completed" | "disputed" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "pending",   label: "Pending" },
  { id: "active",    label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "disputed",  label: "Disputed" },
  { id: "settings",  label: "Settings" },
];

export default function AdminInvestmentsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("pending");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Investment Management</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === tab.id
                ? "bg-gray-800 text-white border-b-2 border-teal-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "pending"   && <PendingTab />}
      {activeTab === "active"    && <ActiveTab />}
      {activeTab === "completed" && <CompletedTab />}
      {activeTab === "disputed"  && <DisputedTab />}
      {activeTab === "settings"  && <SettingsTab />}
    </div>
  );
}
