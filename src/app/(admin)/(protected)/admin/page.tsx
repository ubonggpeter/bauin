"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const AdminActivityChart = dynamic(() => import("@/components/charts/AdminActivityChart"), { ssr: false });

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
          <AdminActivityChart data={data!.chartData} />
        )}
      </div>
    </div>
  );
}
