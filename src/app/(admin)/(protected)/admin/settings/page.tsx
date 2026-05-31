"use client";
import { useEffect, useState } from "react";

// ── Types & constants ────────────────────────────────────────────────────────

type Settings = Record<string, string>;

const DEFAULTS: Settings = {
  // Quiz
  QUIZ_PRIZE_1ST_PCT:            "50",
  QUIZ_PRIZE_2ND_PCT:            "30",
  QUIZ_PRIZE_3RD_PCT:            "20",
  QUIZ_PRIZE_POOL_PCT:           "80",
  QUIZ_ENTRY_FEE:                "500",
  // Referral
  REFERRAL_WORKER_PAYMENT_PCT:   "50",
  REFERRAL_WORKER_DAILY_PCT:     "10",
  REFERRAL_VIEWER_PCT:           "30",
  REFERRAL_VIEWER_UNLOCK_THRESHOLD: "30",
  REFERRAL_WORKER_EXPIRY_MONTHS: "6",
  // Platform fees
  TOOL_POOL_FEE_PCT:             "5",
  STORY_PLATFORM_FEE_PCT:        "20",
  INVESTMENT_AUTO_APPROVE_LIMIT: "200000",
  // Withdrawals
  WITHDRAWAL_MIN_AMOUNT:         "500",
  WITHDRAWAL_MAX_AMOUNT:         "500000",
  WITHDRAWAL_MAX_PER_DAY:        "3",
  WITHDRAWAL_ALLOWED_DAYS:       "",
};

type SectionDef = {
  title: string;
  description?: string;
  fields: FieldDef[];
};

type FieldDef =
  | { type: "number"; key: string; label: string; min?: number; max?: number; step?: number; suffix?: string; description?: string }
  | { type: "text";   key: string; label: string; placeholder?: string; description?: string }
  | { type: "slider"; key: string; label: string; min: number; max: number; step?: number; suffix?: string }
  | { type: "prize-split" }
  | { type: "referral-pcts" };

const SECTIONS: SectionDef[] = [
  {
    title: "Quiz Prize Split",
    description: "How the prize pool is split between winners. Must total 100%.",
    fields: [{ type: "prize-split" }],
  },
  {
    title: "Quiz Settings",
    fields: [
      { type: "slider", key: "QUIZ_PRIZE_POOL_PCT",  label: "Prize Pool %",  min: 0, max: 100, suffix: "% of entry fees", step: 5 },
      { type: "number", key: "QUIZ_ENTRY_FEE",        label: "Default Entry Fee", min: 0, suffix: "₦", description: "Default quiz entry fee for new sessions" },
    ],
  },
  {
    title: "Referral Settings",
    description: "All percentages apply to the referee's spending / earnings.",
    fields: [{ type: "referral-pcts" }],
  },
  {
    title: "Platform Fees",
    fields: [
      { type: "slider", key: "TOOL_POOL_FEE_PCT",       label: "Tool Pool Fee",           min: 0, max: 30, suffix: "%", step: 1 },
      { type: "slider", key: "STORY_PLATFORM_FEE_PCT",  label: "Story Platform Fee",      min: 0, max: 50, suffix: "%", step: 1 },
      { type: "number", key: "INVESTMENT_AUTO_APPROVE_LIMIT", label: "Investment Auto-Approve Limit", min: 0, suffix: "₦",
        description: "Requests at or below this amount are auto-approved" },
    ],
  },
  {
    title: "Withdrawal Settings",
    fields: [
      { type: "number", key: "WITHDRAWAL_MIN_AMOUNT",  label: "Minimum Withdrawal", min: 0, suffix: "₦" },
      { type: "number", key: "WITHDRAWAL_MAX_AMOUNT",  label: "Maximum Withdrawal", min: 0, suffix: "₦" },
      { type: "number", key: "WITHDRAWAL_MAX_PER_DAY", label: "Max Per Day / User", min: 1, max: 100 },
      { type: "text",   key: "WITHDRAWAL_ALLOWED_DAYS",
        label: "Allowed Days (0=Sun … 6=Sat)", placeholder: "e.g. 1,2,3,4,5  (blank = any day)",
        description: "Comma-separated day numbers. Leave blank to allow any day." },
    ],
  },
];

// ── Prize-split sub-component ─────────────────────────────────────────────────

function PrizeSplit({
  values,
  onChange,
}: {
  values: { first: number; second: number; third: number };
  onChange: (v: { first: number; second: number; third: number }) => void;
}) {
  const total = values.first + values.second + values.third;
  const ok    = total === 100;

  function setFirst(n: number) {
    const clamped = Math.min(100, Math.max(0, n));
    onChange({ first: clamped, second: values.second, third: Math.max(0, 100 - clamped - values.second) });
  }
  function setSecond(n: number) {
    const clamped = Math.min(100 - values.first, Math.max(0, n));
    onChange({ first: values.first, second: clamped, third: Math.max(0, 100 - values.first - clamped) });
  }

  return (
    <div className="space-y-4">
      {[
        { rank: "1st", color: "#F0B429", val: values.first, set: setFirst },
        { rank: "2nd", color: "#9ca3af", val: values.second, set: setSecond },
        { rank: "3rd", color: "#cd7c4a", val: values.third, set: null },
      ].map(({ rank, color, val, set }) => (
        <div key={rank} className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm text-white" style={{ background: color }}>
            {rank.replace(/[a-z]+/, "")}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-semibold text-gray-700">{rank} Place</span>
              <span className="text-lg font-bold" style={{ color }}>{val}%</span>
            </div>
            <input
              type="range" min={0} max={100} step={5}
              value={val}
              disabled={!set}
              onChange={(e) => set && set(parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: color }}
            />
          </div>
        </div>
      ))}

      <div className={`flex items-center justify-between px-4 py-2 rounded-xl text-sm font-bold ${ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
        <span>Total</span>
        <span>{total}% {!ok && "— must equal 100%"}</span>
      </div>
    </div>
  );
}

// ── Referral pcts sub-component ───────────────────────────────────────────────

function ReferralPcts({
  values,
  onChange,
}: {
  values: { workerPayment: number; workerDaily: number; viewerPct: number; unlockThreshold: number; expiryMonths: number };
  onChange: (k: string, v: number) => void;
}) {
  const fields = [
    { key: "workerPayment",    label: "Worker — On Payment",   suffix: "%",     min: 0, max: 100, step: 5,
      description: "% of each payment credited to referrer immediately" },
    { key: "workerDaily",      label: "Worker — Daily Bonus",  suffix: "%",     min: 0, max: 100, step: 1,
      description: "% of referee's daily spending credited to referrer" },
    { key: "viewerPct",        label: "Viewer Quiz Entry",     suffix: "%",     min: 0, max: 100, step: 5,
      description: "% locked per quiz entry, unlocked when threshold reached" },
    { key: "unlockThreshold",  label: "Viewer Unlock Threshold", suffix: " recruits", min: 1, max: 500, step: 1,
      description: "Number of quiz recruits before viewer earnings unlock" },
    { key: "expiryMonths",     label: "Worker Bonus Expiry",   suffix: " months", min: 1, max: 36, step: 1,
      description: "How many months before worker referral bonus expires" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {fields.map((f) => (
        <div key={f.key}>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-sm font-semibold text-gray-700">{f.label}</label>
            <span className="text-base font-bold text-primary">{values[f.key as keyof typeof values]}{f.suffix}</span>
          </div>
          <input
            type="range" min={f.min} max={f.max} step={f.step}
            value={values[f.key as keyof typeof values]}
            onChange={(e) => onChange(f.key, parseInt(e.target.value))}
            className="w-full accent-primary"
          />
          {f.description && <p className="text-[10px] text-gray-400 mt-1">{f.description}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULTS });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setSettings({ ...DEFAULTS, ...d.settings });
        setLoading(false);
      });
  }, []);

  function set(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  // Prize split derived state
  const prizeSplit = {
    first:  parseInt(settings.QUIZ_PRIZE_1ST_PCT ?? "50"),
    second: parseInt(settings.QUIZ_PRIZE_2ND_PCT ?? "30"),
    third:  parseInt(settings.QUIZ_PRIZE_3RD_PCT ?? "20"),
  };

  // Referral derived state
  const referral = {
    workerPayment:   parseInt(settings.REFERRAL_WORKER_PAYMENT_PCT       ?? "50"),
    workerDaily:     parseInt(settings.REFERRAL_WORKER_DAILY_PCT         ?? "10"),
    viewerPct:       parseInt(settings.REFERRAL_VIEWER_PCT               ?? "30"),
    unlockThreshold: parseInt(settings.REFERRAL_VIEWER_UNLOCK_THRESHOLD  ?? "30"),
    expiryMonths:    parseInt(settings.REFERRAL_WORKER_EXPIRY_MONTHS     ?? "6"),
  };

  const prizeOk = prizeSplit.first + prizeSplit.second + prizeSplit.third === 100;

  async function save() {
    if (!prizeOk) { showToast("Prize split must total 100% before saving."); return; }
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) showToast("Settings saved — Redis cache cleared.");
    else        showToast("Failed to save. Try again.");
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded-xl animate-pulse" />
        {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl border border-border p-6 h-40 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Financial Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">All values saved to PlatformSettings; Redis cache cleared on save.</p>
        </div>
        <button
          onClick={save}
          disabled={saving || !prizeOk}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors flex-shrink-0"
        >
          {saving ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity={.3} /><path d="M12 3a9 9 0 019 9" />
              </svg>
              Saving…
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
              </svg>
              Save All
            </>
          )}
        </button>
      </div>

      {/* Sections */}
      {SECTIONS.map((section) => (
        <div key={section.title} className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-base font-bold text-text-dark">{section.title}</h2>
            {section.description && <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>}
          </div>

          {section.fields.map((field, fi) => {
            if (field.type === "prize-split") {
              return (
                <PrizeSplit
                  key={fi}
                  values={prizeSplit}
                  onChange={(v) => {
                    set("QUIZ_PRIZE_1ST_PCT", String(v.first));
                    set("QUIZ_PRIZE_2ND_PCT", String(v.second));
                    set("QUIZ_PRIZE_3RD_PCT", String(v.third));
                  }}
                />
              );
            }

            if (field.type === "referral-pcts") {
              return (
                <ReferralPcts
                  key={fi}
                  values={referral}
                  onChange={(k, v) => {
                    const MAP: Record<string, string> = {
                      workerPayment:   "REFERRAL_WORKER_PAYMENT_PCT",
                      workerDaily:     "REFERRAL_WORKER_DAILY_PCT",
                      viewerPct:       "REFERRAL_VIEWER_PCT",
                      unlockThreshold: "REFERRAL_VIEWER_UNLOCK_THRESHOLD",
                      expiryMonths:    "REFERRAL_WORKER_EXPIRY_MONTHS",
                    };
                    set(MAP[k], String(v));
                  }}
                />
              );
            }

            if (field.type === "slider") {
              const val = parseInt(settings[field.key] ?? "0");
              return (
                <div key={field.key}>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-sm font-semibold text-gray-700">{field.label}</label>
                    <span className="text-base font-bold text-primary">{val}{field.suffix ?? ""}</span>
                  </div>
                  <input
                    type="range"
                    min={field.min} max={field.max} step={field.step ?? 1}
                    value={val}
                    onChange={(e) => set(field.key, e.target.value)}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>{field.min}{field.suffix ?? ""}</span>
                    <span>{field.max}{field.suffix ?? ""}</span>
                  </div>
                </div>
              );
            }

            if (field.type === "number") {
              return (
                <div key={field.key}>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                    {field.label}
                    {field.suffix && <span className="font-normal text-gray-400 ml-1">({field.suffix})</span>}
                  </label>
                  <input
                    type="number"
                    min={field.min} max={field.max}
                    value={settings[field.key] ?? ""}
                    onChange={(e) => set(field.key, e.target.value)}
                    className="w-48 px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  {field.description && <p className="text-[10px] text-gray-400 mt-1">{field.description}</p>}
                </div>
              );
            }

            if (field.type === "text") {
              return (
                <div key={field.key}>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">{field.label}</label>
                  <input
                    type="text"
                    value={settings[field.key] ?? ""}
                    onChange={(e) => set(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full max-w-sm px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  {field.description && <p className="text-[10px] text-gray-400 mt-1">{field.description}</p>}
                </div>
              );
            }

            return null;
          })}
        </div>
      ))}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  );
}
