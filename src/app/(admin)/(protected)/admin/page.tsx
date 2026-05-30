"use client";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

type Stats = {
  totalUsers: number;
  activeUsers: number;
  pendingKyc: number;
  totalRevenue: number;
  pendingWithdrawals: number;
  pendingWithdrawalVolume: number;
  activeInvestments: number;
  totalInvestmentVolume: number;
};

type ChartPoint = {
  date: string;
  revenue: number;
  withdrawals: number;
  investments: number;
};

type DashData = { stats: Stats; chartData: ChartPoint[] };

function fmt(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(1)}K`;
  return `₦${n.toLocaleString()}`;
}

function fmtDate(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

const STAT_CARDS = (s: Stats) => [
  {
    label: "Total Users",
    value: s.totalUsers.toLocaleString(),
    sub: `${s.activeUsers.toLocaleString()} active`,
    color: "#1A6659",
  },
  {
    label: "Pending KYC",
    value: s.pendingKyc.toLocaleString(),
    sub: "awaiting review",
    color: "#F0B429",
  },
  {
    label: "Total Revenue",
    value: fmt(s.totalRevenue),
    sub: "all-time deposits",
    color: "#1A6659",
  },
  {
    label: "Pending Withdrawals",
    value: s.pendingWithdrawals.toLocaleString(),
    sub: fmt(s.pendingWithdrawalVolume) + " queued",
    color: "#ef4444",
  },
  {
    label: "Active Investments",
    value: s.activeInvestments.toLocaleString(),
    sub: "funded",
    color: "#1A6659",
  },
  {
    label: "Investment Volume",
    value: fmt(s.totalInvestmentVolume),
    sub: "all-time funded",
    color: "#1A6659",
  },
];

// Show every 5th day label on x-axis
function buildTicks(chartData: ChartPoint[]) {
  return chartData.filter((_, i) => i % 5 === 0).map((d) => d.date);
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-dark">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform overview — last 30 days</p>
      </div>

      {/* Stats cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-border animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {STAT_CARDS(data!.stats).map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-2xl p-5 border border-border shadow-sm"
              style={{ borderLeft: `4px solid ${card.color}` }}
            >
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{card.label}</p>
              <p className="text-2xl font-bold text-text-dark mt-1">{card.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        <h2 className="text-base font-semibold text-text-dark mb-4">30-Day Activity</h2>
        {loading ? (
          <div className="h-56 animate-pulse bg-gray-100 rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data!.chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                ticks={buildTicks(data!.chartData)}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => fmt(v)}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip
                formatter={(v: number, name: string) => [fmt(v), name.charAt(0).toUpperCase() + name.slice(1)]}
                labelFormatter={fmtDate}
                contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              />
              <Line dataKey="revenue"     name="Revenue"     stroke="#1A6659" strokeWidth={2} dot={false} />
              <Line dataKey="withdrawals" name="Withdrawals" stroke="#F0B429" strokeWidth={2} dot={false} />
              <Line dataKey="investments" name="Investments" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
