"use client";

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { useRef } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface FunnelStep { label: string; count: number; dropOffPct: number }
interface LeaderEntry { name: string; email: string; totalEarned?: number; total?: number; salesCount?: number }
interface QuizDay { date: string; sessions: number; players: number }
interface PhaseStat { phase: string; avg?: number; completed?: number; dropOffPct?: number }
interface MemoryData {
  avgTotalScore: number;
  phaseAvgScores: PhaseStat[];
  phaseDropOff: PhaseStat[];
  highestDropOffPhase: string;
  totalEntries: number;
}
interface QuizSummary { totalSessions: number; avgPlayersPerSession: number; betWinRate: number }
interface Leaderboards {
  topEarners: LeaderEntry[];
  topSellers: LeaderEntry[];
  topDistributors: LeaderEntry[];
  topReferrers: LeaderEntry[];
}

export interface AnalyticsData {
  funnel: FunnelStep[];
  leaderboards: Leaderboards;
  quizDailyData: QuizDay[];
  quizSummary: QuizSummary;
  memory: MemoryData;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
}

function shortDate(iso: string) {
  return iso.slice(5); // "MM-DD"
}

const BRAND   = "#1a3c5e";
const GOLD    = "#c9a84c";
const RED_BAD = "#e55353";
const GREY    = "#94a3b8";

// ── CSV export ────────────────────────────────────────────────────────────────

function downloadCsv(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-text-dark">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Leaderboard table ─────────────────────────────────────────────────────────

function LeaderTable({
  rows, valueLabel, getValue,
}: {
  rows: LeaderEntry[];
  valueLabel: string;
  getValue: (r: LeaderEntry) => string;
}) {
  if (!rows.length) return <p className="text-sm text-text-muted py-4 text-center">No data yet</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-text-muted text-xs">
            <th className="text-left py-2 pr-3 font-medium w-6">#</th>
            <th className="text-left py-2 pr-3 font-medium">Name</th>
            <th className="text-left py-2 font-medium">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.email + i} className="border-b border-border/50 last:border-0">
              <td className="py-2 pr-3 text-text-muted">{i + 1}</td>
              <td className="py-2 pr-3">
                <p className="font-medium text-text-dark truncate max-w-[160px]">{r.name}</p>
                <p className="text-xs text-text-muted truncate max-w-[160px]">{r.email}</p>
              </td>
              <td className="py-2 font-semibold text-primary">{getValue(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminAnalyticsCharts({ data }: { data: AnalyticsData }) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    window.print();
  }

  function handleExportCsv() {
    const sections: [string[][], string][] = [
      [
        [["Step", "Count", "Drop-off %"], ...data.funnel.map((f) => [f.label, String(f.count), String(f.dropOffPct)])],
        "funnel.csv",
      ],
      [
        [["Name", "Email", "Total Earned (₦)"], ...data.leaderboards.topEarners.map((e) => [e.name, e.email, String(e.totalEarned ?? 0)])],
        "top-earners.csv",
      ],
      [
        [["Name", "Email", "Total Earned (₦)"], ...data.leaderboards.topSellers.map((e) => [e.name, e.email, String(e.totalEarned ?? 0)])],
        "top-sellers.csv",
      ],
      [
        [["Name", "Email", "Total Earned (₦)"], ...data.leaderboards.topDistributors.map((e) => [e.name, e.email, String(e.totalEarned ?? 0)])],
        "top-distributors.csv",
      ],
      [
        [["Name", "Email", "Referral Bonus (₦)"], ...data.leaderboards.topReferrers.map((e) => [e.name, e.email, String(e.total ?? 0)])],
        "top-referrers.csv",
      ],
      [
        [["Date", "Sessions", "Players"], ...data.quizDailyData.map((q) => [q.date, String(q.sessions), String(q.players)])],
        "quiz-daily.csv",
      ],
      [
        [["Phase", "Avg Score"], ...data.memory.phaseAvgScores.map((p) => [p.phase.replace("\n", " "), String(p.avg)])],
        "memory-scores.csv",
      ],
    ];

    // Merge all into one CSV with blank lines between sections
    const combined: string[][] = [];
    sections.forEach(([rows, name]) => {
      combined.push([name.replace(".csv", "").toUpperCase()]);
      rows.forEach((r) => combined.push(r));
      combined.push([]);
    });
    downloadCsv(combined, "bauin-analytics.csv");
  }

  return (
    <div ref={printRef} className="space-y-8 print:space-y-6">

      {/* Export controls */}
      <div className="flex justify-end gap-3 print:hidden">
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-border text-text-dark hover:bg-bg-light transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-white hover:bg-primary-dark transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
          </svg>
          Print / PDF
        </button>
      </div>

      {/* ── User Funnel ─────────────────────────────────────────────────────── */}
      <Section
        title="User Funnel"
        action={
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="inline-block w-3 h-3 rounded-sm bg-primary" /> Count
            <span className="inline-block w-3 h-3 rounded-sm bg-red-400 ml-2" /> Drop-off %
          </div>
        }
      >
        {/* Stat pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {data.funnel.map((step, i) => (
            <div key={step.label} className="flex flex-col gap-1 p-3 rounded-xl bg-bg-light border border-border">
              <p className="text-xs text-text-muted font-medium">{step.label}</p>
              <p className="text-xl font-bold text-text-dark">{step.count.toLocaleString()}</p>
              {i > 0 && (
                <p className={`text-xs font-semibold ${step.dropOffPct > 50 ? "text-red-500" : step.dropOffPct > 20 ? "text-amber-500" : "text-green-600"}`}>
                  −{step.dropOffPct}% from prev
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.funnel} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value, name) => [
                name === "count" ? Number(value).toLocaleString() : `${value}%`,
                name === "count" ? "Users" : "Drop-off",
              ]}
            />
            <Bar dataKey="count" name="count" radius={[4, 4, 0, 0]} fill={BRAND}>
              {data.funnel.map((_, i) => <Cell key={i} fill={BRAND} fillOpacity={1 - i * 0.12} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* ── Leaderboards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <Section title="Top 10 Earners">
          <LeaderTable
            rows={data.leaderboards.topEarners}
            valueLabel="Total Earned"
            getValue={(r) => fmt(r.totalEarned ?? 0)}
          />
        </Section>
        <Section title="Top 10 Sellers">
          <LeaderTable
            rows={data.leaderboards.topSellers}
            valueLabel="Earned"
            getValue={(r) => fmt(r.totalEarned ?? 0)}
          />
        </Section>
        <Section title="Top 10 Distributors">
          <LeaderTable
            rows={data.leaderboards.topDistributors}
            valueLabel="Earned"
            getValue={(r) => fmt(r.totalEarned ?? 0)}
          />
        </Section>
        <Section title="Top 10 Referrers">
          <LeaderTable
            rows={data.leaderboards.topReferrers}
            valueLabel="Referral Bonus"
            getValue={(r) => fmt(r.total ?? 0)}
          />
        </Section>
      </div>

      {/* ── Quiz Analytics ───────────────────────────────────────────────────── */}
      <Section title="Quiz Sessions — Last 30 Days">
        {/* Summary pills */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-bg-light border border-border">
            <p className="text-xs text-text-muted font-medium">Total Sessions (all time)</p>
            <p className="text-2xl font-bold text-text-dark mt-1">{data.quizSummary.totalSessions.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl bg-bg-light border border-border">
            <p className="text-xs text-text-muted font-medium">Avg Players / Session</p>
            <p className="text-2xl font-bold text-text-dark mt-1">{data.quizSummary.avgPlayersPerSession}</p>
          </div>
          <div className="p-4 rounded-xl bg-bg-light border border-border">
            <p className="text-xs text-text-muted font-medium">Bet Win Rate</p>
            <p className="text-2xl font-bold text-text-dark mt-1">{data.quizSummary.betWinRate}%</p>
          </div>
        </div>

        {/* Line chart */}
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data.quizDailyData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10 }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip labelFormatter={(l) => String(l)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="sessions" stroke={BRAND} strokeWidth={2} dot={false} name="Sessions" />
            <Line type="monotone" dataKey="players" stroke={GOLD} strokeWidth={2} dot={false} name="Players" />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      {/* ── Memory Game Analytics ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Avg score per phase */}
        <Section title="Memory Game — Avg Score per Phase">
          <div className="mb-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex-1 text-center">
              <p className="text-xs text-text-muted font-medium">Avg Total Score</p>
              <p className="text-xl font-bold text-primary mt-0.5">{data.memory.avgTotalScore}</p>
            </div>
            <div className="p-3 rounded-xl bg-bg-light border border-border flex-1 text-center">
              <p className="text-xs text-text-muted font-medium">Total Entries</p>
              <p className="text-xl font-bold text-text-dark mt-0.5">{data.memory.totalEntries.toLocaleString()}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.memory.phaseAvgScores} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" vertical={false} />
              <XAxis dataKey="phase" tick={{ fontSize: 10 }} tickFormatter={(v) => String(v).split("\n")[0]} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [v, "Avg Score"]} />
              <Bar dataKey="avg" name="Avg Score" radius={[4, 4, 0, 0]}>
                {data.memory.phaseAvgScores.map((_, i) => (
                  <Cell key={i} fill={GOLD} fillOpacity={0.6 + i * 0.08} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        {/* Drop-off per phase */}
        <Section title="Memory Game — Drop-off per Phase">
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            <span className="font-semibold">Highest drop-off:</span> {data.memory.highestDropOffPhase}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.memory.phaseDropOff} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" vertical={false} />
              <XAxis dataKey="phase" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v) => [`${v}%`, "Drop-off"]} />
              <Bar dataKey="dropOffPct" name="Drop-off %" radius={[4, 4, 0, 0]}>
                {data.memory.phaseDropOff.map((p, i) => (
                  <Cell
                    key={i}
                    fill={(p.dropOffPct ?? 0) > 40 ? RED_BAD : (p.dropOffPct ?? 0) > 20 ? "#f59e0b" : GREY}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Completion table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted border-b border-border">
                  <th className="text-left py-1 pr-4">Phase</th>
                  <th className="text-right py-1 pr-4">Completed</th>
                  <th className="text-right py-1">Drop-off</th>
                </tr>
              </thead>
              <tbody>
                {data.memory.phaseDropOff.map((p) => (
                  <tr key={p.phase} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 pr-4 text-text-dark font-medium">{p.phase}</td>
                    <td className="py-1.5 pr-4 text-right text-text-dark">{(p.completed ?? 0).toLocaleString()}</td>
                    <td className={`py-1.5 text-right font-semibold ${(p.dropOffPct ?? 0) > 40 ? "text-red-500" : (p.dropOffPct ?? 0) > 20 ? "text-amber-500" : "text-green-600"}`}>
                      {p.dropOffPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:space-y-6 > * + * { margin-top: 1.5rem; }
        }
      `}</style>
    </div>
  );
}
