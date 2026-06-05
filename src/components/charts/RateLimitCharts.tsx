"use client";

import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar, Cell,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";

// ── Hits per hour ─────────────────────────────────────────────────────────────

interface HourlyPoint { hour: string; count: number }

function fmtHour(h: string) {
  // h = "YYYY-MM-DD HH:00"
  const parts = h.split(" ");
  return parts[1] ?? h;
}

export function HitsPerHourChart({ data }: { data: HourlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="hour"
          tickFormatter={fmtHour}
          ticks={data.filter((_, i) => i % 4 === 0).map((d) => d.hour)}
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          formatter={(v: number) => [v, "Hits"]}
          labelFormatter={(l: string) => l}
          contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
        />
        <Line dataKey="count" stroke="#1A6659" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Top endpoints (horizontal bar) ───────────────────────────────────────────

interface EndpointPoint { endpoint: string; count: number }

function truncate(s: string, n = 28) {
  return s.length > n ? "…" + s.slice(-(n - 1)) : s;
}

export function TopEndpointsChart({ data }: { data: EndpointPoint[] }) {
  const display = data.map((d) => ({ ...d, label: truncate(d.endpoint) }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, display.length * 28 + 20)}>
      <BarChart layout="vertical" data={display} margin={{ top: 4, right: 24, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tick={{ fontSize: 10, fill: "#4b5563" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(v: number) => [v, "Hits"]}
          labelFormatter={(l: string) => l}
          contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {display.map((_, i) => (
            <Cell key={i} fill={i === 0 ? "#1A6659" : i === 1 ? "#2B8A72" : "#4da890"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Top IPs (horizontal bar) ──────────────────────────────────────────────────

interface IpPoint { ip: string; count: number; flagged: boolean; blocked: boolean }

export function TopIpsChart({ data }: { data: IpPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 28 + 20)}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 24, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="ip"
          width={120}
          tick={{ fontSize: 10, fill: "#4b5563" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(v: number) => [v, "Hits"]}
          contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.blocked ? "#ef4444" : d.flagged ? "#f97316" : i === 0 ? "#1A6659" : "#2B8A72"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
