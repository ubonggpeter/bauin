"use client";
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

type ChartPoint = { date: string; amount: number };

export default function WalletLineChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: number) => [`₦${v.toLocaleString()}`, "Amount"]} />
        <Line type="monotone" dataKey="amount" stroke="#1A6659" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
