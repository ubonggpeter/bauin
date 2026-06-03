"use client";

import { useState, useEffect, useCallback } from "react";

type FeatureKey = "AUTO_APPROVALS" | "WITHDRAWALS" | "QUIZ" | "BETTING" | "MAINTENANCE";

type FeatureState = {
  paused: boolean;
  by?: string;
  at?: string;
};

type EmergencyState = {
  AUTO_APPROVALS: FeatureState;
  WITHDRAWALS:    FeatureState;
  QUIZ:           FeatureState;
  BETTING:        FeatureState;
  MAINTENANCE:    FeatureState & { until?: string; message?: string };
};

const FEATURES: {
  key:     FeatureKey;
  label:   string;
  desc:    string;
  color:   string;
  ring:    string;
  pauseBg: string;
  resumeBg:string;
}[] = [
  {
    key:      "AUTO_APPROVALS",
    label:    "Auto-Approvals",
    desc:     "Halts all automatic approval decisions — forces every request to manual admin review.",
    color:    "text-red-600 dark:text-red-400",
    ring:     "ring-red-500",
    pauseBg:  "bg-red-600 hover:bg-red-700",
    resumeBg: "bg-green-600 hover:bg-green-700",
  },
  {
    key:      "WITHDRAWALS",
    label:    "Withdrawals",
    desc:     "Blocks all withdrawal requests with a 503 response. Existing queued requests are unaffected.",
    color:    "text-orange-600 dark:text-orange-400",
    ring:     "ring-orange-500",
    pauseBg:  "bg-orange-600 hover:bg-orange-700",
    resumeBg: "bg-green-600 hover:bg-green-700",
  },
  {
    key:      "QUIZ",
    label:    "Quiz Games",
    desc:     "Prevents users from joining new quiz sessions. In-progress sessions continue normally.",
    color:    "text-teal-600 dark:text-teal-400",
    ring:     "ring-teal-500",
    pauseBg:  "bg-teal-700 hover:bg-teal-800",
    resumeBg: "bg-green-600 hover:bg-green-700",
  },
  {
    key:      "BETTING",
    label:    "Betting",
    desc:     "Blocks all new bet placements with a 503. Settled bets are not affected.",
    color:    "text-orange-600 dark:text-orange-400",
    ring:     "ring-orange-500",
    pauseBg:  "bg-orange-600 hover:bg-orange-700",
    resumeBg: "bg-green-600 hover:bg-green-700",
  },
  {
    key:      "MAINTENANCE",
    label:    "Maintenance Mode",
    desc:     "Shows a fullscreen teal countdown overlay to all non-admin users.",
    color:    "text-teal-600 dark:text-teal-400",
    ring:     "ring-teal-500",
    pauseBg:  "bg-teal-700 hover:bg-teal-800",
    resumeBg: "bg-green-600 hover:bg-green-700",
  },
];

function formatTs(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function EmergencyPage() {
  const [state, setState]         = useState<EmergencyState | null>(null);
  const [loading, setLoading]     = useState(true);
  const [toggling, setToggling]   = useState<FeatureKey | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);

  // Maintenance extra fields
  const [maintUntil, setMaintUntil] = useState("");
  const [maintMsg,   setMaintMsg]   = useState("");

  const load = useCallback(async () => {
    try {
      const res  = await fetch("/api/admin/emergency");
      const data = await res.json() as EmergencyState;
      setState(data);
      if (data.MAINTENANCE.until) {
        setMaintUntil(data.MAINTENANCE.until.slice(0, 16)); // datetime-local format
      }
      if (data.MAINTENANCE.message) {
        setMaintMsg(data.MAINTENANCE.message);
      }
    } catch {
      setError("Failed to load emergency state.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggle(feature: FeatureKey, currentlyPaused: boolean) {
    setToggling(feature);
    setError(null);
    setSuccess(null);
    try {
      const body: Record<string, unknown> = { feature, paused: !currentlyPaused };
      if (feature === "MAINTENANCE" && !currentlyPaused) {
        if (maintUntil) body.maintenanceUntil = new Date(maintUntil).toISOString();
        if (maintMsg)   body.maintenanceMsg   = maintMsg;
      }
      const res = await fetch("/api/admin/emergency", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json() as { error?: string };
        throw new Error(j.error ?? "Request failed");
      }
      setSuccess(`${feature.replace("_", " ")} ${!currentlyPaused ? "paused" : "resumed"}.`);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Emergency Controls</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Instantly pause platform features. All actions are logged.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      <div className="space-y-4">
        {FEATURES.map((f) => {
          const feat   = state?.[f.key] as (FeatureState & { until?: string; message?: string }) | undefined;
          const paused = feat?.paused ?? false;

          return (
            <div
              key={f.key}
              className={`rounded-xl border bg-white dark:bg-gray-800 p-5 shadow-sm ring-1 ${
                paused ? f.ring : "ring-gray-200 dark:ring-gray-700"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        paused ? "bg-red-500 animate-pulse" : "bg-green-500"
                      }`}
                    />
                    <h2 className={`text-base font-semibold ${f.color}`}>{f.label}</h2>
                    <span
                      className={`ml-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        paused
                          ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                          : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                      }`}
                    >
                      {paused ? "PAUSED" : "LIVE"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{f.desc}</p>

                  {paused && feat?.by && (
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      Paused by <span className="font-medium text-gray-600 dark:text-gray-300">{feat.by}</span>
                      {" · "}
                      {formatTs(feat.at)}
                    </p>
                  )}

                  {/* Maintenance extras */}
                  {f.key === "MAINTENANCE" && !paused && (
                    <div className="mt-3 grid gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                          Resume at (optional)
                        </label>
                        <input
                          type="datetime-local"
                          value={maintUntil}
                          onChange={(e) => setMaintUntil(e.target.value)}
                          className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                          Message for users (optional)
                        </label>
                        <textarea
                          value={maintMsg}
                          onChange={(e) => setMaintMsg(e.target.value)}
                          rows={2}
                          placeholder="We're performing scheduled maintenance…"
                          className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 w-full resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  )}

                  {f.key === "MAINTENANCE" && paused && feat?.until && (
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      Scheduled end: <span className="font-medium text-gray-600 dark:text-gray-300">{formatTs(feat.until)}</span>
                    </p>
                  )}
                  {f.key === "MAINTENANCE" && paused && feat?.message && (
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500 italic">
                      &ldquo;{feat.message}&rdquo;
                    </p>
                  )}
                </div>

                <button
                  onClick={() => void toggle(f.key, paused)}
                  disabled={toggling === f.key}
                  className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                    paused ? f.resumeBg : f.pauseBg
                  }`}
                >
                  {toggling === f.key
                    ? "…"
                    : paused
                    ? "Resume"
                    : "Pause"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        All emergency actions are recorded in the audit log.
      </p>
    </div>
  );
}
