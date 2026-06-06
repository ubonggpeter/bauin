"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { HealthMetrics } from "@/app/api/admin/health/route";

// ── Constants ─────────────────────────────────────────────────────────────────

const POLL_INTERVAL_S = 30;
const HISTORY_SIZE    = 20;

const MS_WARN = 500;
const MS_CRIT = 2_000;
const Q_WARN  = 500;
const Q_CRIT  = 1_000;

// ── Threshold helpers ─────────────────────────────────────────────────────────

type Severity = "ok" | "warn" | "crit" | "down";

function msLevel(ms: number | null, ok: boolean): Severity {
  if (!ok || ms === null) return "down";
  if (ms >= MS_CRIT) return "crit";
  if (ms >= MS_WARN) return "warn";
  return "ok";
}

function qLevel(depth: number): Severity {
  if (depth >= Q_CRIT) return "crit";
  if (depth >= Q_WARN) return "warn";
  return "ok";
}

const SEV_RING: Record<Severity, string> = {
  ok:   "ring-2 ring-green-400",
  warn: "ring-2 ring-amber-400",
  crit: "ring-2 ring-red-500",
  down: "ring-2 ring-red-700",
};

const SEV_VALUE: Record<Severity, string> = {
  ok:   "text-green-600",
  warn: "text-amber-500",
  crit: "text-red-500",
  down: "text-red-700",
};

const SEV_DOT: Record<Severity, string> = {
  ok:   "bg-green-400",
  warn: "bg-amber-400",
  crit: "bg-red-500",
  down: "bg-red-700",
};

const SEV_BG: Record<Severity, string> = {
  ok:   "bg-green-50  border-green-200",
  warn: "bg-amber-50  border-amber-200",
  crit: "bg-red-50    border-red-300",
  down: "bg-red-100   border-red-400",
};

// ── Metric card ────────────────────────────────────────────────────────────────

function MetricCard({
  label, value, unit, sub, sev, pulse,
}: {
  label: string; value: string; unit?: string; sub?: string;
  sev: Severity; pulse?: boolean;
}) {
  return (
    <div className={`relative rounded-2xl border p-5 ${SEV_BG[sev]} transition-colors duration-500`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${SEV_DOT[sev]} ${pulse && sev !== "ok" ? "animate-pulse" : ""}`} />
      </div>
      <p className={`mt-2 text-3xl font-black leading-none ${SEV_VALUE[sev]}`}>
        {value}
        {unit && <span className="text-base font-semibold ml-1">{unit}</span>}
      </p>
      {sub && <p className="mt-1.5 text-xs text-text-muted">{sub}</p>}
    </div>
  );
}

// ── Alert banner ───────────────────────────────────────────────────────────────

function AlertBanner({ metrics }: { metrics: HealthMetrics }) {
  const alerts: string[] = [];
  if (!metrics.db.ok)           alerts.push("Database is unreachable");
  if (!metrics.redis.ok)        alerts.push("Redis is unreachable");
  if (metrics.queue.depth > Q_CRIT) alerts.push(`Queue depth is ${metrics.queue.depth.toLocaleString()} (> 1 000)`);
  else if (metrics.db.latencyMs !== null && metrics.db.latencyMs >= MS_CRIT)
    alerts.push(`DB latency critical: ${metrics.db.latencyMs} ms`);
  if (metrics.redis.latencyMs !== null && metrics.redis.latencyMs >= MS_CRIT)
    alerts.push(`Redis latency critical: ${metrics.redis.latencyMs} ms`);

  if (!alerts.length) return null;

  return (
    <div className="rounded-xl border border-red-300 bg-red-50 px-5 py-3 flex items-start gap-3">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <div>
        {alerts.map((a) => (
          <p key={a} className="text-sm font-semibold text-red-700">{a}</p>
        ))}
        <p className="text-xs text-red-500 mt-0.5">Admin alert email sent (rate-limited to once per 5 min)</p>
      </div>
    </div>
  );
}

// ── Countdown ring ─────────────────────────────────────────────────────────────

function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - seconds / total);
  return (
    <svg width="48" height="48" className="-rotate-90">
      <circle cx="24" cy="24" r={r} stroke="#e5e7eb" strokeWidth="3" fill="none" />
      <circle
        cx="24" cy="24" r={r}
        stroke={seconds <= 5 ? "#f59e0b" : "#1a3c5e"}
        strokeWidth="3" fill="none"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s linear" }}
      />
    </svg>
  );
}

// ── History point ──────────────────────────────────────────────────────────────

interface HistPoint {
  time:       string;
  apiMs:      number | null;
  dbMs:       number | null;
  redisMs:    number | null;
  queueDepth: number;
  wsTotal:    number;
}

function toHistPoint(m: HealthMetrics): HistPoint {
  const t = new Date(m.timestamp);
  const time = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}:${String(t.getSeconds()).padStart(2, "0")}`;
  return {
    time,
    apiMs:      m.responseMs,
    dbMs:       m.db.latencyMs,
    redisMs:    m.redis.latencyMs,
    queueDepth: m.queue.depth,
    wsTotal:    m.ws.total,
  };
}

// ── Chart wrapper ──────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
      <p className="text-sm font-semibold text-text-dark mb-4">{title}</p>
      {children}
    </div>
  );
}

// ── Latency chart — one line per service ───────────────────────────────────────

function LatencyChart({ history }: { history: HistPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={history} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
        <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10 }} unit="ms" width={42} />
        <Tooltip formatter={(v, n) => [`${v} ms`, String(n)]} />
        <ReferenceLine y={MS_WARN} stroke="#f59e0b" strokeDasharray="4 3" label={{ value: "500 ms", fontSize: 10, fill: "#f59e0b" }} />
        <ReferenceLine y={MS_CRIT} stroke="#ef4444" strokeDasharray="4 3" label={{ value: "2 s",    fontSize: 10, fill: "#ef4444" }} />
        <Line type="monotone" dataKey="apiMs"   stroke="#1a3c5e" strokeWidth={2} dot={false} name="API" connectNulls />
        <Line type="monotone" dataKey="dbMs"    stroke="#c9a84c" strokeWidth={2} dot={false} name="DB"  connectNulls />
        <Line type="monotone" dataKey="redisMs" stroke="#6366f1" strokeWidth={2} dot={false} name="Redis" connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

function QueueChart({ history }: { history: HistPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={history} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
        <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10 }} width={42} />
        <Tooltip />
        <ReferenceLine y={Q_WARN} stroke="#f59e0b" strokeDasharray="4 3" label={{ value: "500", fontSize: 10, fill: "#f59e0b" }} />
        <ReferenceLine y={Q_CRIT} stroke="#ef4444" strokeDasharray="4 3" label={{ value: "1 000", fontSize: 10, fill: "#ef4444" }} />
        <Line type="monotone" dataKey="queueDepth" stroke="#e55353" strokeWidth={2} dot={false} name="Queue depth" />
        <Line type="monotone" dataKey="wsTotal"    stroke="#10b981" strokeWidth={2} dot={false} name="WS clients" />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminHealthDashboard() {
  const [metrics,   setMetrics]   = useState<HealthMetrics | null>(null);
  const [history,   setHistory]   = useState<HistPoint[]>([]);
  const [countdown, setCountdown] = useState(POLL_INTERVAL_S);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [lastOk,    setLastOk]    = useState<string>("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cdRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: HealthMetrics = await res.json();
      setMetrics(data);
      setHistory((prev) => [...prev.slice(-(HISTORY_SIZE - 1)), toHistPoint(data)]);
      setLastOk(new Date().toLocaleTimeString());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  // initial fetch + 30s poll
  useEffect(() => {
    void fetchMetrics();
    timerRef.current = setInterval(() => {
      void fetchMetrics();
      setCountdown(POLL_INTERVAL_S);
    }, POLL_INTERVAL_S * 1_000);
    return () => { clearInterval(timerRef.current!); };
  }, [fetchMetrics]);

  // 1-second countdown tick
  useEffect(() => {
    cdRef.current = setInterval(() => {
      setCountdown((c) => (c <= 1 ? POLL_INTERVAL_S : c - 1));
    }, 1_000);
    return () => { clearInterval(cdRef.current!); };
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────

  const m = metrics;

  const dbSev    = m ? msLevel(m.db.latencyMs,    m.db.ok)    : "down";
  const redisSev = m ? msLevel(m.redis.latencyMs, m.redis.ok) : "down";
  const apiSev   = m ? msLevel(m.responseMs,      true)       : "ok";
  const qSev     = m ? qLevel(m.queue.depth)                  : "ok";

  const anyAlert = m && (!m.db.ok || !m.redis.ok || m.queue.depth > Q_CRIT || dbSev === "crit" || redisSev === "crit");

  function fmtMs(ms: number | null, ok: boolean): string {
    if (!ok || ms === null) return "DOWN";
    return `${ms}`;
  }

  return (
    <div className="space-y-6">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <CountdownRing seconds={countdown} total={POLL_INTERVAL_S} />
          <div>
            <p className="text-xs text-text-muted">Next refresh in <span className="font-semibold text-text-dark">{countdown}s</span></p>
            {lastOk && <p className="text-xs text-text-muted">Last OK: {lastOk}</p>}
          </div>
        </div>
        <button
          onClick={() => { void fetchMetrics(); setCountdown(POLL_INTERVAL_S); }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-white hover:bg-primary-dark disabled:opacity-50 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}>
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          {loading ? "Polling…" : "Refresh now"}
        </button>
      </div>

      {/* ── Error state ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-5 py-3 text-sm text-red-700 font-medium">
          Failed to fetch metrics: {error}
        </div>
      )}

      {/* ── Alert banner ─────────────────────────────────────────────────────── */}
      {anyAlert && m && <AlertBanner metrics={m} />}

      {/* ── Metric cards ─────────────────────────────────────────────────────── */}
      {m && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard
            label="API Response"
            value={fmtMs(m.responseMs, true)}
            unit={m.responseMs !== null ? "ms" : undefined}
            sub="Full health round-trip"
            sev={apiSev}
            pulse
          />
          <MetricCard
            label="DB Query"
            value={fmtMs(m.db.latencyMs, m.db.ok)}
            unit={m.db.ok && m.db.latencyMs !== null ? "ms" : undefined}
            sub={m.db.ok ? "SELECT 1 latency" : "Unreachable"}
            sev={dbSev}
            pulse
          />
          <MetricCard
            label="Redis Latency"
            value={fmtMs(m.redis.latencyMs, m.redis.ok)}
            unit={m.redis.ok && m.redis.latencyMs !== null ? "ms" : undefined}
            sub={m.redis.ok ? `Hit rate: ${m.redis.hitRate !== null ? `${m.redis.hitRate}%` : "N/A"}` : "Unreachable"}
            sev={redisSev}
            pulse
          />
          <MetricCard
            label="WebSocket Clients"
            value={String(m.ws.total)}
            sub={`Quiz ${m.ws.quiz} · Notif ${m.ws.notifications} · Bet ${m.ws.betting}`}
            sev="ok"
          />
          <MetricCard
            label="Active Quizzes"
            value={String(m.activeSessions)}
            sub="Sessions not yet ENDED"
            sev="ok"
          />
          <MetricCard
            label="Queue Depth"
            value={String(m.queue.depth)}
            sub={`Wait ${m.queue.waiting} · Act ${m.queue.active} · Fail ${m.queue.failed}`}
            sev={qSev}
            pulse
          />
        </div>
      )}

      {/* ── Uptime pill ───────────────────────────────────────────────────────── */}
      {m && (
        <div className="flex items-center gap-6 text-sm text-text-muted flex-wrap">
          <span>
            <span className="font-semibold text-text-dark">Uptime:</span>{" "}
            {Math.floor(m.uptime / 3600)}h {Math.floor((m.uptime % 3600) / 60)}m {m.uptime % 60}s
          </span>
          <span>
            <span className="font-semibold text-text-dark">Snapshot:</span>{" "}
            {new Date(m.timestamp).toLocaleString()}
          </span>
          <span>
            <span className="font-semibold text-text-dark">Queue completed (in-mem):</span>{" "}
            {m.queue.completed.toLocaleString()}
          </span>
        </div>
      )}

      {/* ── Charts ────────────────────────────────────────────────────────────── */}
      {history.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section title="Response Latency Trend (last 20 polls)">
            <div className="flex items-center gap-4 text-xs text-text-muted mb-3">
              <span className="flex items-center gap-1"><span className="inline-block w-6 h-0.5 bg-[#1a3c5e]" /> API</span>
              <span className="flex items-center gap-1"><span className="inline-block w-6 h-0.5 bg-[#c9a84c]" /> DB</span>
              <span className="flex items-center gap-1"><span className="inline-block w-6 h-0.5 bg-[#6366f1]" /> Redis</span>
            </div>
            <LatencyChart history={history} />
          </Section>

          <Section title="Queue Depth &amp; WebSocket Clients (last 20 polls)">
            <div className="flex items-center gap-4 text-xs text-text-muted mb-3">
              <span className="flex items-center gap-1"><span className="inline-block w-6 h-0.5 bg-[#e55353]" /> Queue depth</span>
              <span className="flex items-center gap-1"><span className="inline-block w-6 h-0.5 bg-[#10b981]" /> WS clients</span>
            </div>
            <QueueChart history={history} />
          </Section>
        </div>
      )}

      {/* ── Detail tables ─────────────────────────────────────────────────────── */}
      {m && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* DB */}
          <div className={`rounded-2xl border p-5 ${SEV_BG[dbSev]}`}>
            <p className="text-xs font-bold uppercase tracking-wide text-text-muted mb-3">Database</p>
            <Row label="Status"  value={m.db.ok ? "✓ Connected" : "✗ Down"}  vClass={m.db.ok ? "text-green-600" : "text-red-600 font-bold"} />
            <Row label="Latency" value={m.db.latencyMs !== null ? `${m.db.latencyMs} ms` : "—"} vClass={SEV_VALUE[dbSev]} />
            <Row label="Threshold" value="500 ms warn · 2 000 ms crit" vClass="text-text-muted" />
          </div>

          {/* Redis */}
          <div className={`rounded-2xl border p-5 ${SEV_BG[redisSev]}`}>
            <p className="text-xs font-bold uppercase tracking-wide text-text-muted mb-3">Redis</p>
            <Row label="Status"   value={m.redis.ok ? "✓ Connected" : "✗ Down"} vClass={m.redis.ok ? "text-green-600" : "text-red-600 font-bold"} />
            <Row label="Latency"  value={m.redis.latencyMs !== null ? `${m.redis.latencyMs} ms` : "—"} vClass={SEV_VALUE[redisSev]} />
            <Row label="Hit Rate" value={m.redis.hitRate !== null ? `${m.redis.hitRate}%` : "N/A"} vClass="text-text-dark" />
          </div>

          {/* Queue */}
          <div className={`rounded-2xl border p-5 ${SEV_BG[qSev]}`}>
            <p className="text-xs font-bold uppercase tracking-wide text-text-muted mb-3">Email Queue</p>
            <Row label="Depth"     value={String(m.queue.depth)}     vClass={SEV_VALUE[qSev]} />
            <Row label="Waiting"   value={String(m.queue.waiting)}   />
            <Row label="Active"    value={String(m.queue.active)}    />
            <Row label="Delayed"   value={String(m.queue.delayed)}   />
            <Row label="Failed"    value={String(m.queue.failed)}    vClass={m.queue.failed > 0 ? "text-amber-600 font-semibold" : undefined} />
            <Row label="Completed (in-mem)" value={m.queue.completed.toLocaleString()} />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, vClass }: { label: string; value: string; vClass?: string }) {
  return (
    <div className="flex justify-between items-baseline py-1 border-b border-black/5 last:border-0 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className={`font-semibold text-text-dark ${vClass ?? ""}`}>{value}</span>
    </div>
  );
}
