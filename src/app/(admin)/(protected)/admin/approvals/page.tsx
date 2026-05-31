"use client";
import { useCallback, useEffect, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type Stats = {
  autoApprovedToday: number;
  manualQueue: number;
  sampleReviews: number;
  totalRules: number;
  activeRules: number;
};

type Condition = { field: string; operator: string; value: string };

type Rule = {
  id: string;
  name: string;
  ruleType: string;
  conditionsJson: { conditions?: Condition[] } | Record<string, unknown>;
  isActive: boolean;
  dailyLimitPerUser: number | null;
  sampleReviewRate: string;
  _count: { logs: number };
};

type QueueItem = {
  id: string;
  requestType: string;
  requestData: Record<string, unknown>;
  isSampleReview: boolean;
  createdAt: string;
  rule: { name: string; ruleType: string } | null;
};

// ── Constants ────────────────────────────────────────────────────────────────

const RULE_TYPES = [
  "WITHDRAWAL", "INVESTMENT_REQUEST", "TOOL_POOL", "STORY_CREATE", "STORY_SUBMIT",
];

const FIELDS = [
  { value: "amount",         label: "Amount (₦)" },
  { value: "price",          label: "Price (₦)" },
  { value: "roiPct",         label: "ROI %" },
  { value: "months",         label: "Duration (months)" },
  { value: "monthlyCost",    label: "Monthly Cost (₦)" },
  { value: "title",          label: "Title" },
  { value: "description",    label: "Description" },
  { value: "kycStatus",      label: "KYC Status" },
  { value: "role",           label: "User Role" },
  { value: "accountAgeDays", label: "Account Age (days)" },
  { value: "capacity",       label: "Capacity" },
];

const OPERATORS = [
  { value: "lte",         label: "≤" },
  { value: "lt",          label: "<" },
  { value: "gte",         label: "≥" },
  { value: "gt",          label: ">" },
  { value: "eq",          label: "=" },
  { value: "neq",         label: "≠" },
  { value: "min_length",  label: "min length" },
  { value: "max_length",  label: "max length" },
  { value: "contains",    label: "contains" },
  { value: "not_contains",label: "not contains" },
];

function blankCondition(): Condition {
  return { field: "amount", operator: "lte", value: "" };
}

function conditionSummary(cond: Condition) {
  const f = FIELDS.find((x) => x.value === cond.field)?.label ?? cond.field;
  const o = OPERATORS.find((x) => x.value === cond.operator)?.label ?? cond.operator;
  return `${f} ${o} ${cond.value}`;
}

function ruleConditions(rule: Rule): Condition[] {
  const cj = rule.conditionsJson as { conditions?: Condition[] };
  return Array.isArray(cj.conditions) ? cj.conditions : [];
}

// ── Rule Builder Modal ────────────────────────────────────────────────────────

function RuleModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Rule;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName]             = useState(initial?.name ?? "");
  const [ruleType, setRuleType]     = useState(initial?.ruleType ?? RULE_TYPES[0]);
  const [conditions, setConditions] = useState<Condition[]>(
    initial ? ruleConditions(initial) : [blankCondition()],
  );
  const [dailyLimit, setDailyLimit] = useState<string>(
    initial?.dailyLimitPerUser != null ? String(initial.dailyLimitPerUser) : "",
  );
  const [sampleRate, setSampleRate] = useState<string>(
    initial ? String(Math.round(Number(initial.sampleReviewRate) * 100)) : "0",
  );
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  function addCondition() {
    setConditions((prev) => [...prev, blankCondition()]);
  }

  function removeCondition(i: number) {
    setConditions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateCondition(i: number, patch: Partial<Condition>) {
    setConditions((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  async function handleSave() {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");

    const payload = {
      name: name.trim(),
      ruleType,
      conditions,
      dailyLimitPerUser: dailyLimit ? parseInt(dailyLimit) : null,
      sampleReviewRate: parseFloat(sampleRate) || 0,
    };

    const url    = initial ? `/api/admin/approvals/rules/${initial.id}` : "/api/admin/approvals/rules";
    const method = initial ? "PATCH" : "POST";
    const res    = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (res.ok) { onSave(); onClose(); }
    else        { const d = await res.json(); setError(d.error ?? "Failed to save"); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-text-dark">
            {initial ? "Edit Rule" : "New Auto-Approval Rule"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Name + Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rule Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Auto-approve small withdrawals"
                className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rule Type</label>
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
              >
                {RULE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600">Conditions (ALL must pass)</label>
              <button
                onClick={addCondition}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add condition
              </button>
            </div>

            <div className="space-y-2">
              {conditions.length === 0 && (
                <p className="text-xs text-gray-400 italic py-2">No conditions — all requests will be auto-approved.</p>
              )}
              {conditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-2">
                  {/* Field */}
                  <select
                    value={cond.field}
                    onChange={(e) => updateCondition(i, { field: e.target.value })}
                    className="flex-1 px-2 py-2 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary bg-white"
                  >
                    {FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>

                  {/* Operator */}
                  <select
                    value={cond.operator}
                    onChange={(e) => updateCondition(i, { operator: e.target.value })}
                    className="w-32 px-2 py-2 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary bg-white"
                  >
                    {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>

                  {/* Value */}
                  <input
                    value={cond.value}
                    onChange={(e) => updateCondition(i, { value: e.target.value })}
                    placeholder="value"
                    className="w-28 px-2 py-2 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary"
                  />

                  {/* Remove */}
                  <button
                    onClick={() => removeCondition(i)}
                    className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Daily limit + Sample rate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Daily Limit per User
                <span className="font-normal text-gray-400 ml-1">(blank = unlimited)</span>
              </label>
              <input
                type="number"
                min="0"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                placeholder="e.g. 3"
                className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Sample Review Rate
                <span className="font-normal text-gray-400 ml-1">(%)</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={sampleRate}
                onChange={(e) => setSampleRate(e.target.value)}
                placeholder="e.g. 10"
                className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                {parseFloat(sampleRate) > 0
                  ? `${sampleRate}% of qualifying requests will be flagged for manual review`
                  : "No sampling — all qualifying requests auto-approved"}
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : initial ? "Save Changes" : "Create Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminApprovalsPage() {
  const [tab, setTab]                 = useState<"rules" | "queue">("rules");
  const [stats, setStats]             = useState<Stats | null>(null);
  const [rules, setRules]             = useState<Rule[]>([]);
  const [queue, setQueue]             = useState<QueueItem[]>([]);
  const [queueTotal, setQueueTotal]   = useState(0);
  const [queuePage, setQueuePage]     = useState(1);
  const [queuePages, setQueuePages]   = useState(1);
  const [loading, setLoading]         = useState(true);
  const [queueLoading, setQueueLoading] = useState(false);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editRule, setEditRule]       = useState<Rule | undefined>(undefined);
  const [toast, setToast]             = useState("");
  const [pausing, setPausing]         = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [allPaused, setAllPaused]     = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  const loadStats = useCallback(async () => {
    const res  = await fetch("/api/admin/approvals/stats");
    const data = await res.json();
    setStats(data);
    setAllPaused(data.totalRules > 0 && data.activeRules === 0);
  }, []);

  const loadRules = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/admin/approvals/rules");
    const data = await res.json();
    setRules(data.rules ?? []);
    setLoading(false);
  }, []);

  const loadQueue = useCallback(async (page = 1) => {
    setQueueLoading(true);
    const res  = await fetch(`/api/admin/approvals/queue?page=${page}`);
    const data = await res.json();
    setQueue(data.items ?? []);
    setQueueTotal(data.total ?? 0);
    setQueuePage(data.page ?? 1);
    setQueuePages(data.pages ?? 1);
    setQueueLoading(false);
  }, []);

  useEffect(() => {
    loadStats();
    loadRules();
  }, [loadStats, loadRules]);

  useEffect(() => {
    if (tab === "queue") loadQueue(1);
  }, [tab, loadQueue]);

  async function toggleRule(rule: Rule) {
    await fetch(`/api/admin/approvals/rules/${rule.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isActive: !rule.isActive }),
    });
    loadRules();
    loadStats();
  }

  async function deleteRule(id: string) {
    if (!confirm("Delete this rule?")) return;
    await fetch(`/api/admin/approvals/rules/${id}`, { method: "DELETE" });
    showToast("Rule deleted.");
    loadRules();
    loadStats();
  }

  async function reviewItem(id: string, outcome: "APPROVED" | "REJECTED") {
    setActioningId(id);
    const res = await fetch(`/api/admin/approvals/queue/${id}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ outcome }),
    });
    setActioningId(null);
    if (res.ok) {
      showToast(`Item ${outcome.toLowerCase()}.`);
      setQueue((prev) => prev.filter((q) => q.id !== id));
      setQueueTotal((t) => t - 1);
      loadStats();
    }
  }

  async function handleEmergencyPause() {
    const action = allPaused ? "resume" : "pause";
    if (!confirm(`${action === "pause" ? "Pause ALL rules?" : "Resume all rules?"} This affects all auto-approvals immediately.`)) return;
    setPausing(true);
    const res  = await fetch("/api/admin/approvals/pause", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ pause: !allPaused }),
    });
    const data = await res.json();
    setPausing(false);
    showToast(data.message);
    setAllPaused(!allPaused);
    loadRules();
    loadStats();
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Approvals</h1>
          <p className="text-sm text-gray-500 mt-0.5">Auto-approval rules and manual review queue</p>
        </div>
        <button
          onClick={handleEmergencyPause}
          disabled={pausing || !stats || stats.totalRules === 0}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 ${
            allPaused
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-red-600 hover:bg-red-700 text-white"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            {allPaused
              ? <><polygon points="5 3 19 12 5 21 5 3" /></>
              : <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>
            }
          </svg>
          {pausing ? "Working…" : allPaused ? "Resume All Rules" : "Emergency Pause All"}
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm" style={{ borderLeft: "4px solid #1A6659" }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Auto-Approved Today</p>
          <p className="text-3xl font-bold text-text-dark mt-1">{stats?.autoApprovedToday ?? "—"}</p>
          <p className="text-xs text-gray-400 mt-0.5">{stats?.activeRules ?? 0} active rules</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm" style={{ borderLeft: "4px solid #ea580c" }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Manual Queue</p>
          <p className="text-3xl font-bold text-text-dark mt-1">{stats?.manualQueue ?? "—"}</p>
          <p className="text-xs text-gray-400 mt-0.5">awaiting review</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm" style={{ borderLeft: "4px solid #3b82f6" }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Sample Reviews Today</p>
          <p className="text-3xl font-bold text-text-dark mt-1">{stats?.sampleReviews ?? "—"}</p>
          <p className="text-xs text-gray-400 mt-0.5">random quality checks</p>
        </div>
      </div>

      {/* All-paused banner */}
      {allPaused && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-sm font-semibold text-red-700">All auto-approval rules are paused. Every request is going to manual review.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(["rules", "queue"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
              tab === t ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "queue" ? `Manual Queue${stats?.manualQueue ? ` (${stats.manualQueue})` : ""}` : "Rules"}
          </button>
        ))}
      </div>

      {/* ── RULES TAB ── */}
      {tab === "rules" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditRule(undefined); setModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Rule
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-border p-5 animate-pulse h-24" />
              ))}
            </div>
          ) : rules.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border p-12 text-center">
              <p className="text-gray-400 text-sm">No rules yet. Create one to start auto-approving requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => {
                const conds = ruleConditions(rule);
                const rate  = Math.round(Number(rule.sampleReviewRate) * 100);
                return (
                  <div key={rule.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="font-semibold text-text-dark">{rule.name}</p>
                          <span className="text-[11px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {rule.ruleType.replace(/_/g, " ")}
                          </span>
                          {!rule.isActive && (
                            <span className="text-[11px] font-medium bg-red-100 text-red-600 px-2 py-0.5 rounded-full">PAUSED</span>
                          )}
                        </div>

                        {/* Condition pills */}
                        {conds.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {conds.map((c, i) => (
                              <span key={i} className="text-[11px] bg-primary/8 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                                {conditionSummary(c)}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Meta */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          {rule.dailyLimitPerUser && (
                            <span>Daily limit: {rule.dailyLimitPerUser}/user</span>
                          )}
                          {rate > 0 && <span>Sample rate: {rate}%</span>}
                          <span>{rule._count.logs.toLocaleString()} logged</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {/* ON/OFF toggle */}
                        <button
                          onClick={() => toggleRule(rule)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            rule.isActive ? "bg-primary" : "bg-gray-300"
                          }`}
                          title={rule.isActive ? "Click to pause" : "Click to activate"}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${rule.isActive ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                        <span className={`text-xs font-semibold w-6 ${rule.isActive ? "text-primary" : "text-gray-400"}`}>
                          {rule.isActive ? "ON" : "OFF"}
                        </span>

                        {/* Edit */}
                        <button
                          onClick={() => { setEditRule(rule); setModalOpen(true); }}
                          className="text-gray-400 hover:text-primary transition-colors"
                          title="Edit rule"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete rule"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── QUEUE TAB ── */}
      {tab === "queue" && (
        <div className="space-y-3">
          {queueLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-border p-5 animate-pulse h-28" />
              ))}
            </div>
          ) : queue.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm font-medium">Queue is empty</p>
              <p className="text-gray-400 text-xs mt-1">All manual review items have been handled.</p>
            </div>
          ) : (
            <>
              {queue.map((item) => {
                const data = item.requestData as Record<string, unknown>;
                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                            {item.requestType.replace(/_/g, " ")}
                          </span>
                          {item.isSampleReview && (
                            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              Sample Review
                            </span>
                          )}
                          {item.rule && (
                            <span className="text-xs text-gray-400">via rule: {item.rule.name}</span>
                          )}
                        </div>

                        {/* Request data summary */}
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
                          {Object.entries(data)
                            .filter(([, v]) => v !== null && v !== undefined && String(v).length > 0)
                            .slice(0, 6)
                            .map(([k, v]) => (
                              <div key={k} className="text-xs">
                                <span className="text-gray-400 capitalize">{k.replace(/([A-Z])/g, " $1")}: </span>
                                <span className="text-text-dark font-medium truncate">
                                  {typeof v === "number" && (k.toLowerCase().includes("amount") || k.toLowerCase().includes("price") || k.toLowerCase().includes("cost"))
                                    ? `₦${Number(v).toLocaleString()}`
                                    : String(v).slice(0, 60)}
                                </span>
                              </div>
                            ))}
                        </div>

                        <p className="text-[11px] text-gray-400 mt-2">
                          Submitted {new Date(item.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>

                      {/* Approve / Reject */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => reviewItem(item.id, "APPROVED")}
                          disabled={actioningId === item.id}
                          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-colors"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Approve
                        </button>
                        <button
                          onClick={() => reviewItem(item.id, "REJECTED")}
                          disabled={actioningId === item.id}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-colors"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Queue pagination */}
              {queuePages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-gray-500">Page {queuePage} of {queuePages} · {queueTotal} items</p>
                  <div className="flex gap-2">
                    <button onClick={() => loadQueue(queuePage - 1)} disabled={queuePage === 1}
                      className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-gray-50 disabled:opacity-40">Prev</button>
                    <button onClick={() => loadQueue(queuePage + 1)} disabled={queuePage === queuePages}
                      className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-gray-50 disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Rule Builder Modal */}
      {modalOpen && (
        <RuleModal
          initial={editRule}
          onClose={() => { setModalOpen(false); setEditRule(undefined); }}
          onSave={() => { loadRules(); loadStats(); showToast(editRule ? "Rule updated." : "Rule created."); }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  );
}
