"use client";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────
type ChartPoint = { date: string; amount: number };
type Tx = {
  id: string; type: string; amount: number;
  description: string | null; reference: string | null;
  status: string; createdAt: string;
};
type WalletData = {
  balance: number; totalEarned: number; totalWithdrawn: number;
  chartData: ChartPoint[];
  transactions: Tx[];
  viewerLocked: { total: number; recruits: number; unlockThreshold: number };
};

// ── Transaction type metadata ─────────────────────────────────────
const TX_META: Record<string, { label: string; color: string; bg: string }> = {
  REFERRAL_BONUS:        { label: "Referral",    color: "#1A6659", bg: "#1A665915" },
  BET_PAYOUT:            { label: "Bet Win",     color: "#0ea5e9", bg: "#0ea5e915" },
  BET_STAKE:             { label: "Bet Stake",   color: "#ef4444", bg: "#ef444415" },
  STORY_PURCHASE:        { label: "Story Sale",  color: "#8b5cf6", bg: "#8b5cf615" },
  DEPOSIT:               { label: "Deposit",     color: "#1A6659", bg: "#1A665915" },
  WITHDRAWAL:            { label: "Withdrawal",  color: "#f97316", bg: "#f9731615" },
  INVESTMENT_RETURN:     { label: "Investment",  color: "#F0B429", bg: "#F0B42915" },
  CATEGORY_REGISTRATION: { label: "Category",   color: "#6b7280", bg: "#6b728015" },
  ADJUSTMENT:            { label: "Adjustment",  color: "#6b7280", bg: "#6b728015" },
};

// ── Chart tooltip ─────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  const d = new Date(label ?? "");
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="text-gray-500 text-xs mb-1">
        {d.toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
      </p>
      <p className="font-bold text-primary">₦{payload[0].value.toLocaleString()}</p>
    </div>
  );
}

// ── Withdrawal modal ──────────────────────────────────────────────
function WithdrawModal({ balance, onClose, onSuccess }: {
  balance: number; onClose: () => void; onSuccess: (newBalance: number) => void;
}) {
  const [amount, setAmount]     = useState("");
  const [account, setAccount]   = useState("");
  const [bank, setBank]         = useState("");
  const [name, setName]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(amount);
    if (!amt || amt < 500) { setError("Minimum withdrawal is ₦500"); return; }
    if (amt > balance)      { setError("Insufficient balance"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ amount: amt, accountNumber: account, bankName: bank, accountName: name }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Request failed"); return; }
      onSuccess(json.newBalance);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md mx-4 sm:mx-0 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-text-dark text-lg">Withdraw Funds</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-gray-500">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="bg-primary/5 rounded-xl p-3 mb-5 flex items-center justify-between">
          <span className="text-sm text-gray-500">Available balance</span>
          <span className="font-bold text-primary text-lg">₦{balance.toLocaleString()}</span>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Amount (₦)</label>
            <input
              type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000" min="500" max={balance} step="1"
              className="w-full px-4 py-3 border border-border rounded-xl text-sm text-text-dark bg-bg-light focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Bank Name</label>
            <input
              type="text" value={bank} onChange={(e) => setBank(e.target.value)}
              placeholder="e.g. GTBank"
              className="w-full px-4 py-3 border border-border rounded-xl text-sm text-text-dark bg-bg-light focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Account Number</label>
            <input
              type="text" value={account} onChange={(e) => setAccount(e.target.value)}
              placeholder="10-digit NUBAN" maxLength={10}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm text-text-dark bg-bg-light focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Account Name</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="As on bank account"
              className="w-full px-4 py-3 border border-border rounded-xl text-sm text-text-dark bg-bg-light focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-gold text-text-dark font-bold py-3.5 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-60 text-sm"
          >
            {loading ? "Processing…" : "Submit Withdrawal Request"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Balance card ──────────────────────────────────────────────────
function BalanceCard({
  label, value, sub, dark, action,
}: {
  label: string; value: string; sub?: string; dark?: boolean; action?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl p-5 flex flex-col gap-1 ${dark ? "bg-primary text-white" : "bg-white border border-border"}`}>
      <p className={`text-xs font-medium ${dark ? "text-primary-light" : "text-gray-400"}`}>{label}</p>
      <p className={`text-3xl font-black mt-1 ${dark ? "text-white" : "text-text-dark"}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${dark ? "text-primary-light/80" : "text-gray-400"}`}>{sub}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────
export default function WalletPage() {
  const [data, setData]         = useState<WalletData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [txFilter, setTxFilter] = useState<string>("ALL");

  function load() {
    setLoading(true);
    fetch("/api/wallet")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const txTypes = data
    ? ["ALL", ...Array.from(new Set(data.transactions.map((t) => t.type)))]
    : ["ALL"];

  const filteredTx = data?.transactions.filter((t) =>
    txFilter === "ALL" || t.type === txFilter
  ) ?? [];

  // X-axis tick formatter
  function fmtDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
  }

  // Show only every 5th tick to avoid crowding
  const ticks = data?.chartData
    .filter((_, i) => i % 5 === 0 || i === (data.chartData.length - 1))
    .map((p) => p.date) ?? [];

  return (
    <div className="min-h-screen bg-bg-light">
      {/* Header */}
      <div className="bg-white border-b border-border px-6 py-5">
        <h1 className="text-xl font-bold text-text-dark">Wallet</h1>
        <p className="text-sm text-gray-500 mt-0.5">Earnings, history &amp; withdrawals</p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <div className="text-center py-16 text-gray-400 text-sm">Failed to load wallet data.</div>
        ) : (
          <>
            {/* ── Balance cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <BalanceCard
                dark label="Available Balance"
                value={`₦${data.balance.toLocaleString()}`}
                sub="Ready to withdraw"
                action={
                  <button
                    onClick={() => setShowModal(true)}
                    className="bg-gold text-text-dark text-xs font-bold px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors"
                  >
                    Withdraw
                  </button>
                }
              />
              <BalanceCard
                label="Total Earned"
                value={`₦${data.totalEarned.toLocaleString()}`}
                sub="All-time earnings"
              />
              <BalanceCard
                label="Total Withdrawn"
                value={`₦${data.totalWithdrawn.toLocaleString()}`}
                sub="All-time withdrawals"
              />
            </div>

            {/* ── Earnings chart ── */}
            <div className="bg-white border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-semibold text-text-dark text-sm">Earnings — Last 30 Days</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Referral bonuses, bet payouts &amp; story sales</p>
                </div>
                <span className="text-xs text-primary font-semibold bg-primary/8 px-2.5 py-1 rounded-full">
                  ₦{data.chartData.reduce((s, p) => s + p.amount, 0).toLocaleString()}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="date" tickFormatter={fmtDate} ticks={ticks}
                    tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => v >= 1000 ? `₦${(v / 1000).toFixed(0)}k` : `₦${v}`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone" dataKey="amount"
                    stroke="#1A6659" strokeWidth={2.5}
                    dot={false} activeDot={{ r: 5, fill: "#1A6659", strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* ── Viewer lock progress ── */}
            {data.viewerLocked.total > 0 && (
              <div className="bg-white border border-gold/30 rounded-2xl p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#F0B429" strokeWidth={2} className="w-5 h-5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-text-dark text-sm">Locked Viewer Earnings</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Recruit {data.viewerLocked.unlockThreshold} quiz viewers to unlock{" "}
                      <span className="font-semibold text-gold">₦{data.viewerLocked.total.toLocaleString()}</span>
                    </p>
                  </div>
                  <span className="text-lg font-black text-gold">₦{data.viewerLocked.total.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                  <span>Recruits</span>
                  <span className="font-semibold text-text-dark">
                    {data.viewerLocked.recruits} / {data.viewerLocked.unlockThreshold}
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gold to-yellow-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(data.viewerLocked.recruits / data.viewerLocked.unlockThreshold * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  {Math.max(0, data.viewerLocked.unlockThreshold - data.viewerLocked.recruits)} more viewer{Math.max(0, data.viewerLocked.unlockThreshold - data.viewerLocked.recruits) !== 1 ? "s" : ""} needed — share your quiz link in the Referrals page.
                </p>
              </div>
            )}

            {/* ── Transactions ── */}
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-3 flex-wrap">
                <h3 className="font-semibold text-text-dark text-sm flex-1">Transaction History</h3>
                {/* Filter chips */}
                <div className="flex gap-1.5 flex-wrap">
                  {txTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTxFilter(t)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                        txFilter === t
                          ? "bg-primary text-white"
                          : "bg-bg-light text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {t === "ALL" ? "All" : (TX_META[t]?.label ?? t)}
                    </button>
                  ))}
                </div>
              </div>

              {filteredTx.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-gray-400 text-sm">No transactions yet.</p>
                  <p className="text-gray-300 text-xs mt-1">Start earning by growing your network.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-bg-light text-gray-400 text-xs uppercase tracking-wide">
                        <th className="px-5 py-3 text-left font-medium">Type</th>
                        <th className="px-5 py-3 text-left font-medium">Description</th>
                        <th className="px-5 py-3 text-right font-medium">Amount</th>
                        <th className="px-5 py-3 text-right font-medium">Status</th>
                        <th className="px-5 py-3 text-right font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredTx.map((tx) => {
                        const meta = TX_META[tx.type] ?? { label: tx.type, color: "#6b7280", bg: "#6b728015" };
                        const isCredit = !["WITHDRAWAL", "BET_STAKE", "CATEGORY_REGISTRATION",
                          "CATEGORY_MONTHLY_FEE", "CATEGORY_RETRY_FEE", "TOOL_POOL_FEE"].includes(tx.type);
                        return (
                          <tr key={tx.id} className="hover:bg-bg-light/60 transition-colors">
                            <td className="px-5 py-3.5">
                              <span
                                className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
                                style={{ color: meta.color, backgroundColor: meta.bg }}
                              >
                                {meta.label}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-gray-500 text-xs max-w-[200px] truncate">
                              {tx.description ?? tx.reference ?? "—"}
                            </td>
                            <td className={`px-5 py-3.5 text-right font-semibold tabular-nums ${
                              isCredit ? "text-primary" : "text-red-500"
                            }`}>
                              {isCredit ? "+" : "-"}₦{tx.amount.toLocaleString()}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                tx.status === "COMPLETED" ? "bg-green-50 text-green-600"
                                : tx.status === "PENDING"   ? "bg-yellow-50 text-yellow-600"
                                : tx.status === "FAILED"    ? "bg-red-50 text-red-500"
                                : "bg-gray-100 text-gray-500"
                              }`}>
                                {tx.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right text-gray-400 text-xs whitespace-nowrap">
                              {new Date(tx.createdAt).toLocaleDateString("en-NG", {
                                day: "numeric", month: "short", year: "2-digit",
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Withdrawal modal */}
      {showModal && data && (
        <WithdrawModal
          balance={data.balance}
          onClose={() => setShowModal(false)}
          onSuccess={(newBalance) => {
            setShowModal(false);
            setData((prev) => prev ? { ...prev, balance: newBalance } : prev);
            load();
          }}
        />
      )}
    </div>
  );
}
