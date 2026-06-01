"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

// ── Slider definitions ────────────────────────────────────────────────────────

const SLIDERS = [
  {
    key:     "users",
    label:   "Registered Users",
    min:     1_000,
    max:     200_000,
    step:    1_000,
    default: 10_000,
    fmt:     (v: number) => v.toLocaleString("en-NG"),
    suffix:  "users",
  },
  {
    key:     "categoriesPerUser",
    label:   "Avg Categories / User",
    min:     1,
    max:     5,
    step:    0.1,
    default: 1.5,
    fmt:     (v: number) => v.toFixed(1),
    suffix:  "categories",
  },
  {
    key:     "quizSessions",
    label:   "Quiz Sessions / Month",
    min:     1,
    max:     52,
    step:    1,
    default: 8,
    fmt:     (v: number) => String(v),
    suffix:  "sessions",
  },
  {
    key:     "playersPerSession",
    label:   "Players per Session",
    min:     10,
    max:     500,
    step:    10,
    default: 80,
    fmt:     (v: number) => v.toLocaleString("en-NG"),
    suffix:  "players",
  },
  {
    key:     "entryFee",
    label:   "Quiz Entry Fee",
    min:     100,
    max:     5_000,
    step:    100,
    default: 500,
    fmt:     (v: number) => `₦${v.toLocaleString("en-NG")}`,
    suffix:  "",
  },
  {
    key:     "storySales",
    label:   "Story Sales / Month",
    min:     0,
    max:     20_000,
    step:    100,
    default: 500,
    fmt:     (v: number) => v.toLocaleString("en-NG"),
    suffix:  "sales",
  },
] as const;

type SliderKey = typeof SLIDERS[number]["key"];
type SliderValues = Record<SliderKey, number>;

// ── Assumption definitions ────────────────────────────────────────────────────

type AssumptionKey =
  | "registrationFee"
  | "monthlySubFee"
  | "avgStoryPrice"
  | "commissionPct"
  | "operatingCostPct";

const DEFAULT_ASSUMPTIONS: Record<AssumptionKey, number> = {
  registrationFee:   5_000,
  monthlySubFee:     2_000,
  avgStoryPrice:     800,
  commissionPct:     20,
  operatingCostPct:  35,
};

// ── Calculation engine ────────────────────────────────────────────────────────

type Projection = {
  registration:  number;
  subscriptions: number;
  quiz:          number;
  marketplace:   number;
  gross:         number;
  costs:         number;
  net:           number;
};

function compute(s: SliderValues, a: Record<AssumptionKey, number>): Projection {
  const registration  = s.users * a.registrationFee;
  const subscriptions = s.users * s.categoriesPerUser * a.monthlySubFee;
  const quiz          = s.quizSessions * s.playersPerSession * s.entryFee * 0.3;
  const marketplace   = s.storySales * a.avgStoryPrice * (a.commissionPct / 100);
  const gross         = registration + subscriptions + quiz + marketplace;
  const costs         = gross * (a.operatingCostPct / 100);
  const net           = gross - costs;
  return { registration, subscriptions, quiz, marketplace, gross, costs, net };
}

// ── Formatting ────────────────────────────────────────────────────────────────

function fmtM(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000)     return `₦${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)         return `₦${(n / 1_000).toFixed(1)}k`;
  return `₦${n.toLocaleString("en-NG")}`;
}
function fmtFull(n: number) {
  return `₦${n.toLocaleString("en-NG")}`;
}

// ── SVG bar chart ─────────────────────────────────────────────────────────────

type BarData = { label: string; value: number; color: string };

function BarChart({ bars, annual }: { bars: BarData[]; annual: boolean }) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  const H   = 160;
  const W   = 100 / bars.length;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 100 ${H + 28}`}
        preserveAspectRatio="none"
        className="w-full h-40 overflow-visible"
        aria-hidden
      >
        {bars.map((bar, i) => {
          const h  = ((annual ? bar.value * 12 : bar.value) / (annual ? max * 12 : max)) * H;
          const x  = i * W + W * 0.12;
          const bw = W * 0.76;
          const y  = H - h;
          return (
            <g key={bar.label}>
              <rect
                x={x} y={y}
                width={bw} height={h}
                fill={bar.color}
                rx="1.5"
                opacity="0.9"
              />
              <text
                x={x + bw / 2} y={H + 10}
                textAnchor="middle"
                fontSize="4.5"
                fill="#9ca3af"
              >
                {bar.label}
              </text>
            </g>
          );
        })}
        {/* Baseline */}
        <line x1="0" y1={H} x2="100" y2={H} stroke="rgba(255,255,255,0.1)" strokeWidth="0.4" />
      </svg>
    </div>
  );
}

// ── Stacked bar ───────────────────────────────────────────────────────────────

function StackedBar({ proj }: { proj: Projection }) {
  const streams: { key: keyof Projection; label: string; color: string }[] = [
    { key: "registration",  label: "Registration",   color: "#14B8A6" },
    { key: "subscriptions", label: "Subscriptions",  color: "#A855F7" },
    { key: "quiz",          label: "Quiz (30%)",      color: "#F59E0B" },
    { key: "marketplace",   label: "Marketplace",    color: "#22C55E" },
  ];
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {streams.map((s) => {
          const pct = proj.gross > 0 ? (proj[s.key] as number / proj.gross) * 100 : 0;
          return pct > 0.5 ? (
            <div
              key={s.key}
              style={{ width: `${pct}%`, backgroundColor: s.color }}
              title={`${s.label}: ${fmtM(proj[s.key] as number)} (${pct.toFixed(1)}%)`}
            />
          ) : null;
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
        {streams.map((s) => {
          const pct = proj.gross > 0 ? (proj[s.key] as number / proj.gross) * 100 : 0;
          return (
            <div key={s.key} className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
              <span>{s.label} · {pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Slider component ──────────────────────────────────────────────────────────

function Slider({
  cfg,
  value,
  onChange,
}: {
  cfg:      typeof SLIDERS[number];
  value:    number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - cfg.min) / (cfg.max - cfg.min)) * 100;
  return (
    <div className="group">
      <div className="flex justify-between items-baseline mb-1.5">
        <label className="text-xs text-gray-400 font-medium">{cfg.label}</label>
        <span className="text-sm font-bold text-white tabular-nums">
          {cfg.fmt(value)}{cfg.suffix ? ` ${cfg.suffix}` : ""}
        </span>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="absolute inset-x-0 h-1.5 bg-white/10 rounded-full">
          <div
            className="h-full bg-teal-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          min={cfg.min}
          max={cfg.max}
          step={cfg.step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
        <div
          className="absolute w-4 h-4 bg-teal-400 rounded-full shadow-lg pointer-events-none transition-all"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
    </div>
  );
}

// ── Revenue card ──────────────────────────────────────────────────────────────

function RevenueCard({
  label,
  monthly,
  annual,
  color,
  icon,
  note,
  showAnnual,
}: {
  label:      string;
  monthly:    number;
  annual:     number;
  color:      string;
  icon:       string;
  note:       string;
  showAnnual: boolean;
}) {
  return (
    <div className="revenue-card bg-white/5 border border-white/8 rounded-xl p-4 print:border-gray-200 print:bg-white">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-gray-400 font-medium">{label}</span>
      </div>
      <div className="text-xl font-black" style={{ color }}>
        {fmtM(showAnnual ? annual : monthly)}
      </div>
      <div className="text-[10px] text-gray-600 mt-0.5">{note}</div>
    </div>
  );
}

// ── Scenario comparison ───────────────────────────────────────────────────────

function scenarioLabel(factor: number) {
  return factor === 0.5 ? "Conservative (0.5×)" : factor === 1 ? "Base Case (1×)" : "Optimistic (2×)";
}

// ── Print stylesheet ──────────────────────────────────────────────────────────

const PRINT_CSS = `
@media print {
  @page { size: A4 landscape; margin: 14mm 16mm; }
  body { background: white !important; color: #111 !important; }
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .revenue-card { border: 1px solid #e5e7eb !important; background: #fafafa !important; border-radius: 8px; }
  .print-bg { background: white !important; }
  * { color: inherit; }
}
`;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectionsPage() {
  // Slider state
  const [sliders, setSliders] = useState<SliderValues>(() => {
    const d: Partial<SliderValues> = {};
    for (const s of SLIDERS) (d as Record<string, number>)[s.key] = s.default;
    return d as SliderValues;
  });

  // Assumptions state
  const [assumptions, setAssumptions] = useState({ ...DEFAULT_ASSUMPTIONS });
  const [showAssumptions, setShowAssumptions] = useState(false);

  // UI state
  const [annual, setAnnual]     = useState(false);
  const [scenario, setScenario] = useState<0.5 | 1 | 2>(1);

  // Computed
  const scaled = useMemo<SliderValues>(() => {
    const s = { ...sliders };
    // Apply scenario to users and sessions (non-fee inputs)
    return {
      ...s,
      users:            Math.round(s.users            * scenario),
      quizSessions:     Math.round(s.quizSessions     * scenario),
      playersPerSession:Math.round(s.playersPerSession * scenario),
      storySales:       Math.round(s.storySales        * scenario),
    };
  }, [sliders, scenario]);

  const proj = useMemo(() => compute(scaled, assumptions), [scaled, assumptions]);

  const display = (v: number) => annual ? v * 12 : v;

  const BAR_DATA: BarData[] = [
    { label: "Reg.",     value: proj.registration,  color: "#14B8A6" },
    { label: "Subs",     value: proj.subscriptions,  color: "#A855F7" },
    { label: "Quiz",     value: proj.quiz,           color: "#F59E0B" },
    { label: "Market.",  value: proj.marketplace,    color: "#22C55E" },
  ];

  // Print styles injection
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = PRINT_CSS;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, []);

  const printDate = new Date().toLocaleDateString("en-NG", { dateStyle: "long" });

  return (
    <div className="min-h-screen bg-[#070F0D] print-bg">
      {/* ── Print header (hidden on screen) ── */}
      <div className="print-only hidden print:block mb-6">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center">
              <span className="text-[#070F0D] font-black text-sm">B</span>
            </div>
            <div>
              <div className="font-black text-lg text-gray-900">BAUIN</div>
              <div className="text-xs text-gray-500">Billionaires AI Users Income Network</div>
            </div>
          </div>
          <div className="text-right text-xs text-gray-400">
            <div className="font-semibold text-gray-700">Revenue Projection Model</div>
            <div>Generated {printDate}</div>
            <div>Scenario: {scenarioLabel(scenario)} · {annual ? "Annual" : "Monthly"}</div>
          </div>
        </div>
      </div>

      {/* ── Navbar ── */}
      <nav className="no-print flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
            <span className="text-[#070F0D] font-black text-sm">B</span>
          </div>
          <span className="text-white font-bold text-lg">BAUIN</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/earnings-proof" className="text-gray-400 hover:text-white text-sm transition-colors">
            Earnings Proof
          </Link>
          <Link
            href="/auth/register"
            className="bg-amber-400 text-[#070F0D] font-bold text-sm px-5 py-2 rounded-full hover:bg-amber-300 transition-colors"
          >
            Join BAUIN
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        {/* ── Page title ── */}
        <div className="pt-8 pb-10 text-center">
          <span className="inline-flex items-center gap-2 bg-teal-900/40 border border-teal-700/50 rounded-full px-4 py-1.5 mb-5">
            <span className="text-teal-300 text-xs font-bold tracking-widest uppercase">Interactive Model</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">Revenue Projection Tool</h1>
          <p className="text-gray-400 text-sm max-w-lg mx-auto">
            Adjust the sliders to model BAUIN&apos;s revenue across different growth scenarios.
            All figures are projections based on platform assumptions.
          </p>
        </div>

        {/* ── Controls bar ── */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-8 bg-white/5 border border-white/8 rounded-2xl px-5 py-3">
          {/* Period toggle */}
          <div className="flex gap-1 bg-black/30 rounded-lg p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${!annual ? "bg-teal-700 text-white" : "text-gray-400 hover:text-white"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${annual ? "bg-teal-700 text-white" : "text-gray-400 hover:text-white"}`}
            >
              Annual (×12)
            </button>
          </div>

          {/* Scenario */}
          <div className="flex gap-1 bg-black/30 rounded-lg p-1">
            {([0.5, 1, 2] as const).map((sc) => (
              <button
                key={sc}
                onClick={() => setScenario(sc)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${scenario === sc ? "bg-amber-500 text-[#070F0D]" : "text-gray-400 hover:text-white"}`}
              >
                {sc === 0.5 ? "Conservative" : sc === 1 ? "Base" : "Optimistic"}
              </button>
            ))}
          </div>

          {/* Export */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a1 1 0 001 1h8a1 1 0 001-1v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a1 1 0 00-1-1H6a1 1 0 00-1 1zm2 0h6v3H7V4zm-1 9h8v3H6v-3zm7-5a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
            </svg>
            Export PDF
          </button>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">

          {/* ── Left: Sliders ── */}
          <div className="no-print space-y-6">
            <div className="bg-white/5 border border-white/8 rounded-2xl p-6 space-y-6">
              <h2 className="text-sm font-bold text-white">Inputs</h2>
              {SLIDERS.map((s) => (
                <Slider
                  key={s.key}
                  cfg={s}
                  value={sliders[s.key]}
                  onChange={(v) =>
                    setSliders((prev) => ({ ...prev, [s.key]: v }))
                  }
                />
              ))}
            </div>

            {/* Assumptions */}
            <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowAssumptions((p) => !p)}
                className="w-full flex items-center justify-between px-5 py-4 text-sm font-bold text-white"
              >
                <span>Assumptions</span>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`w-4 h-4 text-gray-400 transition-transform ${showAssumptions ? "rotate-180" : ""}`}
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>

              {showAssumptions && (
                <div className="px-5 pb-5 space-y-4 border-t border-white/8">
                  {[
                    { key: "registrationFee"   as AssumptionKey, label: "Registration Fee (₦ / user)", prefix: "₦" },
                    { key: "monthlySubFee"      as AssumptionKey, label: "Monthly Sub (₦ / category)", prefix: "₦" },
                    { key: "avgStoryPrice"      as AssumptionKey, label: "Avg Story Price (₦)",        prefix: "₦" },
                    { key: "commissionPct"      as AssumptionKey, label: "Marketplace Commission (%)",  prefix: ""  },
                    { key: "operatingCostPct"   as AssumptionKey, label: "Operating Cost (% revenue)",  prefix: ""  },
                  ].map(({ key, label, prefix }) => (
                    <div key={key}>
                      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                      <div className="flex items-center gap-2">
                        {prefix && <span className="text-gray-500 text-sm">{prefix}</span>}
                        <input
                          type="number"
                          value={assumptions[key]}
                          onChange={(e) =>
                            setAssumptions((p) => ({ ...p, [key]: Number(e.target.value) }))
                          }
                          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white tabular-nums"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setAssumptions({ ...DEFAULT_ASSUMPTIONS })}
                    className="text-xs text-teal-400 hover:text-teal-300 mt-1"
                  >
                    Reset to defaults
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Results ── */}
          <div className="space-y-5">
            {/* Headline number */}
            <div className="bg-gradient-to-br from-teal-900/60 to-teal-800/30 border border-teal-700/50 rounded-2xl p-6 text-center">
              <div className="text-xs text-teal-400 font-bold uppercase tracking-widest mb-2">
                {annual ? "Annual" : "Monthly"} Net Revenue · {scenarioLabel(scenario)}
              </div>
              <div className="text-5xl sm:text-6xl font-black text-white">
                {fmtFull(display(proj.net))}
              </div>
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="text-center">
                  <div className="text-gray-400 text-xs">Gross</div>
                  <div className="text-white font-bold">{fmtM(display(proj.gross))}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400 text-xs">Costs ({assumptions.operatingCostPct}%)</div>
                  <div className="text-red-400 font-bold">−{fmtM(display(proj.costs))}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400 text-xs">Margin</div>
                  <div className="text-green-400 font-bold">
                    {proj.gross > 0 ? ((proj.net / proj.gross) * 100).toFixed(0) : 0}%
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue stream cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <RevenueCard
                label="Registration"
                monthly={proj.registration}
                annual={proj.registration * 12}
                color="#14B8A6"
                icon="📝"
                note={`${scaled.users.toLocaleString()} users × ₦${assumptions.registrationFee.toLocaleString()}`}
                showAnnual={annual}
              />
              <RevenueCard
                label="Subscriptions"
                monthly={proj.subscriptions}
                annual={proj.subscriptions * 12}
                color="#A855F7"
                icon="🔄"
                note={`${scaled.users.toLocaleString()} × ${sliders.categoriesPerUser.toFixed(1)} cats × ₦${assumptions.monthlySubFee.toLocaleString()}/mo`}
                showAnnual={annual}
              />
              <RevenueCard
                label="Quiz (30%)"
                monthly={proj.quiz}
                annual={proj.quiz * 12}
                color="#F59E0B"
                icon="🏆"
                note={`${scaled.quizSessions} sessions × ${scaled.playersPerSession} players × ₦${sliders.entryFee.toLocaleString()} × 30%`}
                showAnnual={annual}
              />
              <RevenueCard
                label="Marketplace"
                monthly={proj.marketplace}
                annual={proj.marketplace * 12}
                color="#22C55E"
                icon="📚"
                note={`${scaled.storySales.toLocaleString()} sales × ₦${assumptions.avgStoryPrice} × ${assumptions.commissionPct}%`}
                showAnnual={annual}
              />
            </div>

            {/* Chart */}
            <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">Revenue Breakdown</h3>
                <span className="text-xs text-gray-500">{annual ? "Annual" : "Monthly"}</span>
              </div>
              <BarChart bars={BAR_DATA} annual={annual} />
            </div>

            {/* Stacked share */}
            <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-4">Revenue Mix</h3>
              <StackedBar proj={proj} />
            </div>

            {/* Unit economics */}
            <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-4">Unit Economics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  {
                    label:  "Revenue / User",
                    value:  scaled.users > 0 ? fmtM(display(proj.gross) / scaled.users) : "—",
                    sub:    annual ? "per year" : "per month",
                    color:  "#14B8A6",
                  },
                  {
                    label:  "Net / User",
                    value:  scaled.users > 0 ? fmtM(display(proj.net) / scaled.users) : "—",
                    sub:    annual ? "per year" : "per month",
                    color:  "#22C55E",
                  },
                  {
                    label:  "Quiz Yield",
                    value:  scaled.quizSessions > 0
                      ? fmtM(display(proj.quiz) / scaled.quizSessions)
                      : "—",
                    sub:    "per session",
                    color:  "#F59E0B",
                  },
                  {
                    label:  "Gross Margin",
                    value:  `${proj.gross > 0 ? ((proj.net / proj.gross) * 100).toFixed(1) : 0}%`,
                    sub:    `after ${assumptions.operatingCostPct}% costs`,
                    color:  "#A855F7",
                  },
                ].map((u) => (
                  <div key={u.label} className="text-center">
                    <div className="text-lg font-black" style={{ color: u.color }}>{u.value}</div>
                    <div className="text-xs font-semibold text-gray-300 mt-0.5">{u.label}</div>
                    <div className="text-[10px] text-gray-600">{u.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scenario comparison table */}
            <div className="bg-white/5 border border-white/8 rounded-2xl p-5 overflow-x-auto">
              <h3 className="text-sm font-bold text-white mb-4">Scenario Comparison</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-gray-400 text-xs font-semibold pb-3 pr-4">Metric</th>
                    {([0.5, 1, 2] as const).map((sc) => {
                      const p = compute(
                        {
                          ...sliders,
                          users:             Math.round(sliders.users             * sc),
                          quizSessions:      Math.round(sliders.quizSessions      * sc),
                          playersPerSession: Math.round(sliders.playersPerSession  * sc),
                          storySales:        Math.round(sliders.storySales         * sc),
                        },
                        assumptions,
                      );
                      return (
                        <th key={sc} className="text-right text-xs font-semibold text-gray-400 pb-3 pl-3 whitespace-nowrap">
                          {sc === 0.5 ? "Conservative" : sc === 1 ? "Base" : "Optimistic"}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Registration",  fn: (p: Projection) => p.registration  },
                    { label: "Subscriptions", fn: (p: Projection) => p.subscriptions  },
                    { label: "Quiz (30%)",    fn: (p: Projection) => p.quiz           },
                    { label: "Marketplace",   fn: (p: Projection) => p.marketplace    },
                    { label: "Gross Revenue", fn: (p: Projection) => p.gross, bold: true },
                    { label: "Operating Cost",fn: (p: Projection) => -p.costs         },
                    { label: "Net Revenue",   fn: (p: Projection) => p.net,   bold: true, highlight: true },
                  ].map(({ label, fn, bold, highlight }) => {
                    return (
                      <tr key={label} className={`border-b border-white/5 ${highlight ? "bg-teal-900/20" : ""}`}>
                        <td className={`py-2.5 pr-4 text-xs ${bold ? "font-bold text-white" : "text-gray-400"}`}>
                          {label}
                        </td>
                        {([0.5, 1, 2] as const).map((sc) => {
                          const p = compute(
                            {
                              ...sliders,
                              users:             Math.round(sliders.users             * sc),
                              quizSessions:      Math.round(sliders.quizSessions      * sc),
                              playersPerSession: Math.round(sliders.playersPerSession  * sc),
                              storySales:        Math.round(sliders.storySales         * sc),
                            },
                            assumptions,
                          );
                          const v = fn(p);
                          const isNeg = v < 0;
                          return (
                            <td
                              key={sc}
                              className={`py-2.5 pl-3 text-right text-xs tabular-nums ${
                                bold
                                  ? highlight
                                    ? "font-black text-teal-300"
                                    : "font-bold text-white"
                                  : isNeg
                                    ? "text-red-400"
                                    : "text-gray-300"
                              }`}
                            >
                              {isNeg ? `−${fmtM(-v * (annual ? 12 : 1))}` : fmtM(v * (annual ? 12 : 1))}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Disclaimer ── */}
        <p className="text-center text-gray-700 text-xs mt-10 max-w-2xl mx-auto">
          This model is for illustrative purposes only. Projections are based on user-defined inputs and platform
          assumptions, not guaranteed outcomes. Registration revenue assumes one-time fees;
          subscription revenue assumes full monthly retention. Actual results will vary.
        </p>
      </div>
    </div>
  );
}
