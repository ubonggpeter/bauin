"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────

type StoryDist = {
  id: string; title: string; niche: string;
  distributors: number; plays: number;
};
type Monthly = { month: string; revenue: number; sessions: number };
type Summary = {
  totalStories: number; totalDistributors: number;
  totalPlayers: number; totalRevenue: number;
};
type AnalyticsData = {
  storyDistributors: StoryDist[];
  peakHours:  number[];
  retention:  number[];
  monthly:    Monthly[];
  summary:    Summary;
  insight:    string;
  peakHour:   number;
};

// ── Helpers ───────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(0)}k`;
  return `₦${n.toLocaleString("en-NG")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleString("en", {
    month: "short", year: "2-digit",
  });
}

// ── Chart: distributor count per story (horizontal bars) ──────────

function DistributorChart({ data }: { data: StoryDist[] }) {
  const maxDist = Math.max(...data.map((d) => d.distributors), 1);
  return (
    <div className="space-y-3.5">
      {data.slice(0, 10).map((s) => (
        <div key={s.id}>
          <div className="flex items-baseline justify-between text-xs mb-1 gap-2">
            <span className="text-gray-800 font-medium truncate">{s.title}</span>
            <span className="text-gray-400 whitespace-nowrap flex-shrink-0">
              {s.distributors} dist · {s.plays.toLocaleString()} plays
            </span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.max((s.distributors / maxDist) * 100, s.distributors > 0 ? 4 : 0)}%`,
                background: "linear-gradient(90deg,#1A6659,#2D9B82)",
              }}
            />
          </div>
          {s.niche && (
            <p className="text-[10px] text-gray-400 mt-0.5">{s.niche}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Chart: 24-hour peak activity ──────────────────────────────────

function PeakHoursChart({ hours, peakHour }: { hours: number[]; peakHour: number }) {
  const maxVal     = Math.max(...hours, 1);
  const hasData    = hours.some((h) => h > 0);
  const sorted3    = [...hours].sort((a, b) => b - a).slice(0, 3);
  const top3Thresh = sorted3[sorted3.length - 1] ?? 0;
  const H = 80; const W = 14; const gap = 2;
  const totalW = 24 * (W + gap) - gap;

  return (
    <div>
      <div className="overflow-x-auto">
        <svg width={totalW} height={H + 30} viewBox={`0 0 ${totalW} ${H + 30}`} className="min-w-full">
          {hours.map((count, h) => {
            const barH  = Math.max(count > 0 ? 3 : 0, (count / maxVal) * H);
            const x     = h * (W + gap);
            const y     = H - barH;
            const isPeak  = h === peakHour && hasData;
            const isHot   = !isPeak && count >= top3Thresh && count > 0 && hasData;
            const fill    = isPeak ? "#F0B429" : isHot ? "#1A6659" : count > 0 ? "#A7D8CE" : "#F3F4F6";
            const showLbl = h % 6 === 0 || isPeak;
            return (
              <g key={h}>
                <rect x={x} y={y} width={W} height={barH} rx={2} fill={fill} />
                {showLbl && (
                  <text
                    x={x + W / 2} y={H + 16}
                    textAnchor="middle" fontSize={9}
                    fill={isPeak ? "#F0B429" : "#9CA3AF"}
                    fontWeight={isPeak ? "700" : "400"}
                  >
                    {h}h
                  </text>
                )}
                {isPeak && (
                  <text x={x + W / 2} y={y - 4} textAnchor="middle" fontSize={8} fill="#F0B429" fontWeight="700">
                    ▲
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">
        {hasData
          ? <>Peak: <span className="text-gold font-bold">{peakHour}:00 – {(peakHour + 1) % 24}:00</span> · last 30 days</>
          : "No session data yet"}
      </p>
    </div>
  );
}

// ── Chart: episode phase retention (line) ─────────────────────────

const PHASE_LABELS = ["Flash", "Memory", "Sequence", "Fill Gap", "True/False"];

function RetentionChart({ data }: { data: number[] }) {
  const hasData = data.some((v) => v > 0);
  const W = 340; const H = 130;
  const padL = 34; const padB = 26; const padR = 12; const padT = 20;
  const innerW = W - padL - padR;
  const innerH = H - padB - padT;

  const pts = data.map((pct, i) => ({
    x: padL + (i / (data.length - 1)) * innerW,
    y: padT + ((100 - pct) / 100) * innerH,
    pct,
  }));

  const lineD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaD = `${lineD} L ${pts[pts.length - 1].x.toFixed(1)} ${(padT + innerH).toFixed(1)} L ${padL} ${(padT + innerH).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-lg">
      <defs>
        <linearGradient id="retG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1A6659" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#1A6659" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y-axis grid */}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = padT + ((100 - v) / 100) * innerH;
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#F3F4F6" strokeWidth={1} />
            <text x={padL - 4} y={y + 3} textAnchor="end" fontSize={8} fill="#9CA3AF">{v}%</text>
          </g>
        );
      })}

      {hasData && (
        <>
          <path d={areaD} fill="url(#retG)" />
          <path d={lineD} fill="none" stroke="#1A6659" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => {
            const dropped = i > 0 && p.pct < pts[i - 1].pct - 15;
            return (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={5} fill="white" stroke={dropped ? "#EF4444" : "#1A6659"} strokeWidth={2.5} />
                <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize={9}
                  fill={dropped ? "#EF4444" : "#1A6659"} fontWeight="700">
                  {p.pct}%
                </text>
              </g>
            );
          })}
        </>
      )}

      {/* X-axis labels */}
      {pts.map((p, i) => (
        <text key={i} x={p.x} y={H - 6} textAnchor="middle" fontSize={8} fill="#9CA3AF">
          {PHASE_LABELS[i]}
        </text>
      ))}
    </svg>
  );
}

// ── Print CSS ─────────────────────────────────────────────────────

const PRINT_CSS = `
@media print {
  @page { size: A4 portrait; margin: 14mm 16mm; }
  body { background: white !important; -webkit-print-color-adjust: exact; color-adjust: exact; }
  .no-print { display: none !important; }
  .print-header { display: block !important; }
  h2 { break-after: avoid; }
  .chart-section { break-inside: avoid; }
}`;

// ── Section card wrapper ──────────────────────────────────────────

function Card({ title, icon, children, className = "" }: {
  title: string; icon: React.ReactNode;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 chart-section ${className}`}>
      <h2 className="font-black text-gray-900 text-sm mb-4 flex items-center gap-2">
        <span className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0">
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function SellerAnalyticsPage() {
  const [data, setData]       = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const styleRef              = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    fetch("/api/seller/analytics")
      .then((r) => r.json())
      .then((d: AnalyticsData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = PRINT_CSS;
    document.head.appendChild(el);
    styleRef.current = el;
    return () => { document.head.removeChild(el); };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { storyDistributors, peakHours, retention, monthly, summary, insight, peakHour } = data;

  const totalMonthlyRevenue = monthly.reduce((s, m) => s + m.revenue, 0);
  const dropOffPct =
    retention[0] > 0
      ? Math.round(((retention[0] - retention[4]) / retention[0]) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 no-print">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/dashboard/stories"
            className="text-gray-400 hover:text-gray-700 transition-colors" aria-label="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <h1 className="font-black text-gray-900 text-base flex-1">Story Analytics</h1>
          <Link
            href="/dashboard/seller/payouts"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
            Payouts
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Monthly PDF
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* ── Print-only header ── */}
        <div className="print-header hidden mb-6">
          <h1 className="text-2xl font-black text-gray-900">Story Analytics — Monthly Report</h1>
          <p className="text-sm text-gray-400 mt-1">
            {new Date().toLocaleDateString("en-NG", { dateStyle: "long" })}
          </p>
        </div>

        {/* ── Summary stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Published Stories", value: String(summary.totalStories), color: "text-gray-900" },
            { label: "Distributors",      value: String(summary.totalDistributors), color: "text-primary" },
            { label: "Total Players",     value: summary.totalPlayers.toLocaleString(), color: "text-gray-900" },
            { label: "Revenue (12 mo)",   value: fmt(summary.totalRevenue), color: "text-green-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
              <p className={`text-2xl font-black tabular-nums ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── AI Insight card ── */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-sm"
          style={{ background: "linear-gradient(135deg,#1A6659 0%,#0D3D32 100%)" }}>
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle,#F0B429,transparent)" }} />
          <div className="flex items-start gap-4 relative z-10">
            {/* Sparkle icon */}
            <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                <path d="M12 2l2.09 6.41L20.18 10l-5.45 3.97 2.09 6.41L12 16.5l-4.82 3.88 2.09-6.41L3.82 10l6.09-1.59z"
                  fill="#F0B429" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-white/50 font-semibold uppercase tracking-widest mb-1.5">
                Claude AI Insight
              </p>
              <p className="text-white text-[15px] font-semibold leading-snug">{insight}</p>
            </div>
          </div>
          <p className="text-white/20 text-[10px] mt-3 text-right relative z-10">
            Powered by Claude · refreshes every 6 hours
          </p>
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Distributor count per story */}
          <Card
            title="Distributors per Story"
            icon={
              <span className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-primary">
                  <rect x="3" y="11" width="3" height="10" rx="1"/>
                  <rect x="9" y="7" width="3" height="14" rx="1"/>
                  <rect x="15" y="3" width="3" height="18" rx="1"/>
                  <rect x="21" y="9" width="3" height="12" rx="1"/>
                </svg>
              </span>
            }
          >
            {storyDistributors.length > 0
              ? <DistributorChart data={storyDistributors} />
              : <EmptyState msg="Publish stories to see distributor reach" />}
          </Card>

          {/* Peak playing hours */}
          <Card
            title="Peak Playing Hours"
            icon={
              <span className="w-7 h-7 rounded-xl bg-gold/15 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#F0B429" strokeWidth={2} className="w-3.5 h-3.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </span>
            }
          >
            <PeakHoursChart hours={peakHours} peakHour={peakHour} />
          </Card>
        </div>

        {/* Episode retention */}
        <Card
          title="Episode Phase Retention"
          icon={
            <span className="w-7 h-7 rounded-xl bg-purple-100 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth={2} className="w-3.5 h-3.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </span>
          }
        >
          <p className="text-xs text-gray-400 -mt-2 mb-4">% of players who scored in each game phase</p>
          <RetentionChart data={retention} />
          {dropOffPct > 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 mt-4 text-center">
              <span className="font-bold">{dropOffPct}%</span> of players who start don&apos;t reach the final phase —
              consider shortening Phase 3–4 questions to improve completion.
            </p>
          )}
        </Card>

        {/* Monthly table */}
        <Card
          title="Monthly Overview — Last 12 Months"
          icon={
            <span className="w-7 h-7 rounded-xl bg-green-100 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth={2} className="w-3.5 h-3.5">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </span>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 pb-2.5">Month</th>
                  <th className="text-right text-xs font-semibold text-gray-400 pb-2.5">Revenue</th>
                  <th className="text-right text-xs font-semibold text-gray-400 pb-2.5">Sessions</th>
                  <th className="text-right text-xs font-semibold text-gray-400 pb-2.5 no-print">MoM</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m, i) => {
                  const prev  = i > 0 ? monthly[i - 1].revenue : null;
                  const trend = prev !== null && prev > 0
                    ? ((m.revenue - prev) / prev) * 100
                    : null;
                  const isCurrentMonth = m.month === new Date().toISOString().slice(0, 7);
                  return (
                    <tr
                      key={m.month}
                      className={`border-b border-gray-50 transition-colors ${
                        isCurrentMonth ? "bg-primary/3" : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="py-2.5 font-medium text-gray-800">
                        {monthLabel(m.month)}
                        {isCurrentMonth && (
                          <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">now</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-gray-900 tabular-nums">
                        {m.revenue > 0 ? fmt(m.revenue) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-2.5 text-right text-gray-500 tabular-nums">
                        {m.sessions > 0 ? m.sessions : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-2.5 text-right no-print">
                        {trend !== null ? (
                          <span className={`text-xs font-bold ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-gray-200">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td className="pt-3 pb-1 text-xs font-black text-gray-500 uppercase tracking-wide">12-Month Total</td>
                  <td className="pt-3 pb-1 text-right font-black text-green-700 tabular-nums">
                    {totalMonthlyRevenue > 0 ? fmt(totalMonthlyRevenue) : "—"}
                  </td>
                  <td className="pt-3 pb-1 text-right font-bold text-gray-700 tabular-nums">
                    {monthly.reduce((s, m) => s + m.sessions, 0) || "—"}
                  </td>
                  <td className="no-print" />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

      </div>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="h-28 flex items-center justify-center text-gray-300 text-sm">{msg}</div>
  );
}
