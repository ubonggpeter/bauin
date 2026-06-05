"use client";

import { useEffect, useState, useCallback } from "react";
import {
  HitsPerHourChart,
  TopEndpointsChart,
  TopIpsChart,
} from "@/components/charts/RateLimitCharts";
import type { RateLimitStats, IpRow, FlaggedEntry } from "@/lib/server/rate-limit-tracker";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "all" | "flagged" | "blocked" | "whitelisted";
type Action = "block" | "unblock" | "whitelist" | "remove-whitelist" | "dismiss-flag";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", { dateStyle: "short", timeStyle: "short" });
}

function StatusBadge({ row }: { row: IpRow }) {
  if (row.blocked)     return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">Blocked</span>;
  if (row.flagged)     return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-700">Flagged</span>;
  if (row.whitelisted) return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">Whitelisted</span>;
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500">Normal</span>;
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-black ${color}`}>{value.toLocaleString()}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RateLimitsPage() {
  const [stats, setStats]     = useState<RateLimitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<Tab>("all");
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/rate-limits");
      if (res.ok) setStats(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  async function act(ip: string, action: Action) {
    setPending((p) => ({ ...p, [ip + action]: true }));
    try {
      await fetch(`/api/admin/rate-limits/${encodeURIComponent(ip)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await load();
    } finally {
      setPending((p) => { const n = { ...p }; delete n[ip + action]; return n; });
    }
  }

  const busy = (ip: string, action: Action) => !!pending[ip + action];

  // ── Filtered IP rows for table ────────────────────────────────────────────
  const rows: IpRow[] = stats?.topIps ?? [];
  const displayRows = tab === "all"         ? rows
    : tab === "flagged"     ? rows.filter((r) => r.flagged)
    : tab === "blocked"     ? rows.filter((r) => r.blocked)
    : rows.filter((r) => r.whitelisted);

  // Also show blocked/whitelisted IPs not in top-20
  const extraBlocked     = (stats?.blocked     ?? []).filter((ip) => !rows.some((r) => r.ip === ip));
  const extraWhitelisted = (stats?.whitelisted ?? []).filter((ip) => !rows.some((r) => r.ip === ip));

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const s = stats!;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Rate Limit Monitor</h1>
          <p className="text-sm text-gray-400 mt-0.5">Live · auto-refreshes every 30 s</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-primary hover:text-primary transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Hits (24 h)"  value={s.summary.totalHits24h}     color="text-primary" />
        <StatCard label="Flagged IPs"  value={s.summary.flaggedCount}     color="text-orange-600" />
        <StatCard label="Blocked IPs"  value={s.summary.blockedCount}     color="text-red-600" />
        <StatCard label="Whitelisted"  value={s.summary.whitelistedCount} color="text-green-600" />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 lg:col-span-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Hits per Hour (24 h)</p>
          {s.hourly.every((h) => h.count === 0)
            ? <p className="text-sm text-gray-400 text-center py-12">No data yet</p>
            : <HitsPerHourChart data={s.hourly} />}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Top Endpoints</p>
          {s.topEndpoints.length === 0
            ? <p className="text-sm text-gray-400 text-center py-12">No data yet</p>
            : <TopEndpointsChart data={s.topEndpoints} />}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Top IPs</p>
          {s.topIps.length === 0
            ? <p className="text-sm text-gray-400 text-center py-12">No data yet</p>
            : <TopIpsChart data={s.topIps} />}
        </div>

      </div>

      {/* ── Flagged IPs alert section ── */}
      {s.flagged.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-orange-500 flex-shrink-0">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <h2 className="font-bold text-orange-800 text-sm">
              {s.flagged.length} Auto-flagged IP{s.flagged.length !== 1 ? "s" : ""}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-xs text-orange-600 uppercase tracking-wide border-b border-orange-200">
                  <th className="pb-2 pr-4 font-semibold">IP Address</th>
                  <th className="pb-2 pr-4 font-semibold">Reason</th>
                  <th className="pb-2 pr-4 font-semibold">Flagged At</th>
                  <th className="pb-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100">
                {s.flagged.map((f: FlaggedEntry) => (
                  <tr key={f.ip} className="text-gray-700">
                    <td className="py-2.5 pr-4 font-mono text-xs">{f.ip}</td>
                    <td className="py-2.5 pr-4 text-xs text-gray-600">{f.reason}</td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500">{fmtTime(f.flaggedAt)}</td>
                    <td className="py-2.5">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => act(f.ip, "block")}
                          disabled={busy(f.ip, "block")}
                          className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                        >
                          Block
                        </button>
                        <button
                          onClick={() => act(f.ip, "whitelist")}
                          disabled={busy(f.ip, "whitelist")}
                          className="px-3 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                        >
                          Whitelist
                        </button>
                        <button
                          onClick={() => act(f.ip, "dismiss-flag")}
                          disabled={busy(f.ip, "dismiss-flag")}
                          className="px-3 py-1 rounded-lg border border-orange-300 hover:bg-orange-100 text-orange-700 text-xs font-semibold disabled:opacity-50 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── IP table ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">

        {/* Tabs */}
        <div className="flex gap-1 p-4 border-b border-gray-100">
          {(["all", "flagged", "blocked", "whitelisted"] as Tab[]).map((t) => {
            const counts: Record<Tab, number> = {
              all:         rows.length,
              flagged:     rows.filter((r) => r.flagged).length,
              blocked:     rows.filter((r) => r.blocked).length + extraBlocked.length,
              whitelisted: rows.filter((r) => r.whitelisted).length + extraWhitelisted.length,
            };
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  tab === t
                    ? "bg-primary text-white"
                    : "text-gray-500 hover:text-primary hover:bg-gray-50"
                }`}
              >
                {t.replace("-", " ")}
                <span className={`ml-1.5 text-xs ${tab === t ? "text-white/70" : "text-gray-400"}`}>
                  {counts[t]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="px-5 py-3 font-semibold">IP Address</th>
                <th className="px-4 py-3 font-semibold">Hits (all-time)</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayRows.map((row) => (
                <tr key={row.ip} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-gray-800">{row.ip}</td>
                  <td className="px-4 py-3 text-gray-600 font-semibold">{row.count.toLocaleString()}</td>
                  <td className="px-4 py-3"><StatusBadge row={row} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {!row.blocked && !row.whitelisted && (
                        <ActionBtn onClick={() => act(row.ip, "block")} disabled={busy(row.ip, "block")} variant="danger">Block</ActionBtn>
                      )}
                      {row.blocked && (
                        <ActionBtn onClick={() => act(row.ip, "unblock")} disabled={busy(row.ip, "unblock")} variant="ghost">Unblock</ActionBtn>
                      )}
                      {!row.whitelisted && (
                        <ActionBtn onClick={() => act(row.ip, "whitelist")} disabled={busy(row.ip, "whitelist")} variant="success">Whitelist</ActionBtn>
                      )}
                      {row.whitelisted && (
                        <ActionBtn onClick={() => act(row.ip, "remove-whitelist")} disabled={busy(row.ip, "remove-whitelist")} variant="ghost">Remove</ActionBtn>
                      )}
                      {row.flagged && (
                        <ActionBtn onClick={() => act(row.ip, "dismiss-flag")} disabled={busy(row.ip, "dismiss-flag")} variant="ghost">Dismiss flag</ActionBtn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {/* Extra blocked (not in top-20) — only on blocked tab */}
              {tab === "blocked" && extraBlocked.map((ip) => (
                <tr key={ip} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-gray-800">{ip}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">—</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">Blocked</span></td>
                  <td className="px-4 py-3">
                    <ActionBtn onClick={() => act(ip, "unblock")} disabled={busy(ip, "unblock")} variant="ghost">Unblock</ActionBtn>
                  </td>
                </tr>
              ))}

              {/* Extra whitelisted — only on whitelisted tab */}
              {tab === "whitelisted" && extraWhitelisted.map((ip) => (
                <tr key={ip} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-gray-800">{ip}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">—</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">Whitelisted</span></td>
                  <td className="px-4 py-3">
                    <ActionBtn onClick={() => act(ip, "remove-whitelist")} disabled={busy(ip, "remove-whitelist")} variant="ghost">Remove</ActionBtn>
                  </td>
                </tr>
              ))}

              {displayRows.length === 0 &&
               !(tab === "blocked" && extraBlocked.length > 0) &&
               !(tab === "whitelisted" && extraWhitelisted.length > 0) && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400">
                    No IPs in this view
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

// ── Tiny button helper ────────────────────────────────────────────────────────

function ActionBtn({
  children, onClick, disabled, variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  variant: "danger" | "success" | "ghost";
}) {
  const cls =
    variant === "danger"  ? "bg-red-600 hover:bg-red-700 text-white border-transparent" :
    variant === "success" ? "bg-green-600 hover:bg-green-700 text-white border-transparent" :
                            "bg-white hover:bg-gray-50 text-gray-600 border-gray-200";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  );
}
