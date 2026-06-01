"use client";
import { useCallback, useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type FlagUser = {
  id: string;
  name: string | null;
  email: string | null;
  isActive: boolean;
  fraudSuspendedAt: string | null;
};

type FraudFlag = {
  id:        string;
  type:      string;
  severity:  "LOW" | "MEDIUM" | "HIGH";
  status:    "PENDING" | "CONFIRMED" | "DISMISSED";
  evidence:  Record<string, unknown>;
  note:      string | null;
  createdAt: string;
  user:      FlagUser;
  appeals:   { id: string; status: string }[];
};

type AppealFlag = {
  id:        string;
  type:      string;
  severity:  string;
  status:    string;
  evidence:  Record<string, unknown>;
  createdAt: string;
};

type FraudAppeal = {
  id:          string;
  reason:      string;
  status:      "PENDING" | "APPROVED" | "REJECTED";
  reviewNote:  string | null;
  createdAt:   string;
  user:        { id: string; name: string | null; email: string | null };
  flag:        AppealFlag;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function SeverityBadge({ sev }: { sev: string }) {
  const cls =
    sev === "HIGH"   ? "bg-red-900 text-red-300" :
    sev === "MEDIUM" ? "bg-amber-900 text-amber-300" :
                       "bg-gray-700 text-gray-300";
  return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cls}`}>{sev}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "CONFIRMED" ? "bg-red-900 text-red-300" :
    status === "DISMISSED" ? "bg-gray-700 text-gray-400" :
    status === "APPROVED"  ? "bg-green-900 text-green-300" :
    status === "REJECTED"  ? "bg-red-900 text-red-300" :
                             "bg-blue-900 text-blue-300";
  return <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{status}</span>;
}

// ── Tab: Flags ────────────────────────────────────────────────────────────────

function FlagsTab() {
  const [flags, setFlags]         = useState<FraudFlag[]>([]);
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [noteTarget, setNoteTarget] = useState<{ id: string; action: "confirm" | "dismiss" } | null>(null);
  const [note, setNote]           = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fraud/flags");
      const d   = await res.json();
      setFlags(d.flags ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function act(flagId: string, action: "confirm" | "dismiss", noteText?: string) {
    setBusy(flagId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/fraud/flags/${flagId}/${action}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ note: noteText }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? `${action} failed`);
        return;
      }
      setNoteTarget(null);
      setNote("");
      void load();
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-gray-400">Loading…</p>;

  const pending   = flags.filter((f) => f.status === "PENDING");
  const resolved  = flags.filter((f) => f.status !== "PENDING");

  function FlagCard({ flag }: { flag: FraudFlag }) {
    const isBusy     = busy === flag.id;
    const isPending  = flag.status === "PENDING";
    const hasAppeal  = flag.appeals.some((a) => a.status === "PENDING");

    return (
      <div className={`bg-gray-800 rounded-lg p-4 border ${flag.severity === "HIGH" ? "border-red-800" : "border-gray-700"}`}>
        <div className="flex flex-wrap justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge sev={flag.severity} />
            <StatusBadge status={flag.status} />
            <span className="text-sm text-gray-300 font-mono">{flag.type}</span>
            {hasAppeal && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900 text-purple-300">Appeal pending</span>
            )}
            {flag.user.fraudSuspendedAt && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-950 text-red-400">SUSPENDED</span>
            )}
          </div>
          <span className="text-xs text-gray-500">{fmtDate(flag.createdAt)}</span>
        </div>

        <div className="mb-2">
          <p className="text-sm text-white font-medium">
            {flag.user.name ?? "Unknown"}{" "}
            <span className="text-gray-400 font-normal">{flag.user.email}</span>
          </p>
        </div>

        <div className="bg-gray-900 rounded p-2 mb-3 text-xs font-mono text-gray-300 break-all">
          {JSON.stringify(flag.evidence, null, 2)}
        </div>

        {flag.note && (
          <p className="text-xs text-gray-400 italic mb-3">Note: {flag.note}</p>
        )}

        {isPending && (
          <div className="flex gap-2">
            <button
              disabled={isBusy}
              onClick={() => setNoteTarget({ id: flag.id, action: "confirm" })}
              className="px-3 py-1.5 text-sm bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-md"
            >
              {flag.severity === "HIGH" ? "Confirm & Suspend" : "Confirm"}
            </button>
            <button
              disabled={isBusy}
              onClick={() => setNoteTarget({ id: flag.id, action: "dismiss" })}
              className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white rounded-md"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {error && <p className="mb-3 text-red-400 text-sm">{error}</p>}

      {pending.length === 0 && resolved.length === 0 && (
        <p className="text-gray-500">No fraud flags.</p>
      )}

      {pending.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Pending ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map((f) => <FlagCard key={f.id} flag={f} />)}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Resolved ({resolved.length})
          </h3>
          <div className="space-y-3">
            {resolved.map((f) => <FlagCard key={f.id} flag={f} />)}
          </div>
        </div>
      )}

      {/* Note/confirm modal */}
      {noteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="font-semibold text-white mb-1 capitalize">
              {noteTarget.action} Flag
            </h3>
            {noteTarget.action === "confirm" && (
              <p className="text-sm text-amber-400 mb-3">
                {flags.find((f) => f.id === noteTarget.id)?.severity === "HIGH"
                  ? "This is a HIGH severity flag — the user will be auto-suspended."
                  : "Confirming this flag will mark it as fraud."}
              </p>
            )}
            <label className="block text-sm text-gray-300 mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add context about your decision…"
              className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-white mb-4 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setNoteTarget(null); setNote(""); }}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={busy === noteTarget.id}
                onClick={() => void act(noteTarget.id, noteTarget.action, note || undefined)}
                className={`px-4 py-2 text-sm text-white rounded-md disabled:opacity-50 ${
                  noteTarget.action === "confirm"
                    ? "bg-red-700 hover:bg-red-600"
                    : "bg-gray-600 hover:bg-gray-500"
                }`}
              >
                {busy === noteTarget.id ? "…" : noteTarget.action === "confirm" ? "Confirm" : "Dismiss"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Appeals ──────────────────────────────────────────────────────────────

function AppealsTab() {
  const [appeals, setAppeals]     = useState<FraudAppeal[]>([]);
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<FraudAppeal | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fraud/appeals");
      const d   = await res.json();
      setAppeals(d.appeals ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function approve(id: string, note?: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/fraud/appeals/${id}/approve`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ note }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Approve failed");
        return;
      }
      void load();
    } finally {
      setBusy(null);
    }
  }

  async function reject(id: string, reason: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/fraud/appeals/${id}/reject`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ reason }),
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

  const pending  = appeals.filter((a) => a.status === "PENDING");
  const resolved = appeals.filter((a) => a.status !== "PENDING");

  return (
    <div>
      {error && <p className="mb-3 text-red-400 text-sm">{error}</p>}

      {appeals.length === 0 && (
        <p className="text-gray-500">No appeals submitted.</p>
      )}

      {pending.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Pending ({pending.length})
          </h3>
          <div className="space-y-4">
            {pending.map((appeal) => (
              <div key={appeal.id} className="bg-gray-800 rounded-lg p-4 border border-purple-900">
                <div className="flex flex-wrap justify-between gap-2 mb-3">
                  <div>
                    <p className="font-semibold text-white">
                      {appeal.user.name ?? "Unknown"}{" "}
                      <span className="text-gray-400 text-sm font-normal">{appeal.user.email}</span>
                    </p>
                    <p className="text-xs text-gray-500">Submitted {fmtDate(appeal.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SeverityBadge sev={appeal.flag.severity} />
                    <span className="text-xs text-gray-400 font-mono">{appeal.flag.type}</span>
                  </div>
                </div>

                <div className="bg-gray-900 rounded p-3 mb-3">
                  <p className="text-xs text-gray-400 mb-1">Appeal reason:</p>
                  <p className="text-sm text-gray-200">{appeal.reason}</p>
                </div>

                <div className="bg-gray-900 rounded p-2 mb-3 text-xs font-mono text-gray-400 break-all">
                  Evidence: {JSON.stringify(appeal.flag.evidence)}
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={busy === appeal.id}
                    onClick={() => void approve(appeal.id)}
                    className="px-3 py-1.5 text-sm bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-md"
                  >
                    {busy === appeal.id ? "…" : "Approve & Unsuspend"}
                  </button>
                  <button
                    disabled={busy === appeal.id}
                    onClick={() => setRejectTarget(appeal)}
                    className="px-3 py-1.5 text-sm bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white rounded-md"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Resolved ({resolved.length})
          </h3>
          <div className="space-y-3">
            {resolved.map((appeal) => (
              <div key={appeal.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="text-sm text-white">
                      {appeal.user.name ?? "Unknown"}{" "}
                      <span className="text-gray-400">{appeal.user.email}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{appeal.flag.type}</p>
                  </div>
                  <StatusBadge status={appeal.status} />
                </div>
                {appeal.reviewNote && (
                  <p className="text-xs text-gray-400 italic mt-2">Note: {appeal.reviewNote}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="font-semibold text-white mb-1">Reject Appeal</h3>
            <p className="text-sm text-gray-400 mb-4">
              {rejectTarget.user.name} — {rejectTarget.flag.type}
            </p>
            <label className="block text-sm text-gray-300 mb-1">Reason (required)</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Explain why this appeal is being rejected…"
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
                onClick={() => void reject(rejectTarget.id, rejectReason)}
                className="px-4 py-2 text-sm bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white rounded-md"
              >
                {busy === rejectTarget.id ? "…" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "flags" | "appeals";

export default function AdminFraudPage() {
  const [tab, setTab] = useState<Tab>("flags");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Fraud Dashboard</h1>

      <div className="flex gap-1 mb-6 border-b border-gray-700">
        {(["flags", "appeals"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md capitalize transition-colors ${
              tab === t
                ? "bg-gray-800 text-white border-b-2 border-red-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "flags"   && <FlagsTab />}
      {tab === "appeals" && <AppealsTab />}
    </div>
  );
}
