"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type PayoutRow = {
  id: string; date: string; storyId: string; storyTitle: string; isCollab: boolean;
  saleAmount: number; platformCommission: number; royaltyPaid: number; netReceived: number;
  commissionPct: number; royaltyPct: number;
};
type Monthly = {
  month: string; saleAmount: number; platformCommission: number;
  royaltyPaid: number; netReceived: number; count: number;
};
type Totals = { saleAmount: number; platformCommission: number; royaltyPaid: number; netReceived: number };
type Data = { payouts: PayoutRow[]; monthly: Monthly[]; totals: Totals; stories: { id: string; title: string }[] };

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000   ? `₦${(n / 1_000).toFixed(1)}k`
  : `₦${n.toLocaleString("en-NG")}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });

const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleString("en", { month: "short", year: "2-digit" });
};

function isoToDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

// ── CSV download (client-side) ────────────────────────────────────────────────

function downloadCsv(payouts: PayoutRow[], totals: Totals, from: string, to: string) {
  const BOM = "﻿";
  const header = "Date,Story,Type,Sale Amount (₦),Platform Commission (₦),Royalty Out (₦),Net Received (₦)";
  const rows = payouts.map((p) =>
    [
      fmtDate(p.date),
      `"${p.storyTitle.replace(/"/g, '""')}"`,
      p.isCollab ? "Collaborator" : "Author",
      p.saleAmount,
      p.platformCommission,
      p.royaltyPaid,
      p.netReceived,
    ].join(","),
  );
  rows.push(`,,TOTAL,${totals.saleAmount},${totals.platformCommission},${totals.royaltyPaid},${totals.netReceived}`);
  const csv = BOM + [header, ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `bauin-payouts-${from}-${to}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── PDF via print window ──────────────────────────────────────────────────────

function downloadPdf(payouts: PayoutRow[], totals: Totals, from: string, to: string) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const n   = (v: number) => v.toLocaleString("en-NG");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>BAUIN Payout Statement</title>
<style>
  body{font-family:Arial,sans-serif;font-size:11px;margin:24px;color:#1a1a2e}
  .logo{font-size:20px;font-weight:900;color:#1A6659;margin-bottom:2px}
  .sub{color:#666;font-size:10px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{background:#1A6659;color:#fff;padding:7px 9px;text-align:left;font-size:10px;font-weight:700}
  th.r,td.r{text-align:right}
  td{padding:5px 9px;border-bottom:1px solid #eee;font-size:10px}
  tr:nth-child(even) td{background:#f8fafb}
  .tot td{font-weight:700;border-top:2px solid #1A6659;background:#f0f7f5}
  .badge{display:inline-block;padding:1px 6px;border-radius:9px;font-size:9px;font-weight:600;background:#e0f2ef;color:#1A6659}
  .badge.c{background:#fef3c7;color:#92400e}
  .summary{display:flex;gap:16px;margin:12px 0 20px}
  .sc{flex:1;border:1px solid #e0f2ef;border-radius:8px;padding:10px 14px}
  .sc .l{font-size:10px;color:#666;margin-bottom:2px}
  .sc .v{font-size:15px;font-weight:900;color:#1A6659}
</style>
</head><body>
<div class="logo">BAUIN</div>
<div class="sub">Payout Statement &nbsp;·&nbsp; Period: ${from} to ${to} &nbsp;·&nbsp; Generated: ${new Date().toLocaleDateString("en-NG")}</div>
<div class="summary">
  <div class="sc"><div class="l">Total Sales</div><div class="v">₦${n(totals.saleAmount)}</div></div>
  <div class="sc"><div class="l">Platform Commission</div><div class="v">₦${n(totals.platformCommission)}</div></div>
  <div class="sc"><div class="l">Royalty Out</div><div class="v">₦${n(totals.royaltyPaid)}</div></div>
  <div class="sc"><div class="l">Net Received</div><div class="v">₦${n(totals.netReceived)}</div></div>
</div>
<table>
<thead><tr>
  <th>Date</th><th>Story / Episode</th><th>Type</th>
  <th class="r">Sale (₦)</th><th class="r">Commission (₦)</th><th class="r">Royalty Out (₦)</th><th class="r">Net (₦)</th>
</tr></thead>
<tbody>
${payouts.map((p) => `<tr>
  <td>${fmtDate(p.date)}</td>
  <td>${esc(p.storyTitle)}</td>
  <td><span class="badge${p.isCollab ? " c" : ""}">${p.isCollab ? "Collab" : "Author"}</span></td>
  <td class="r">${n(p.saleAmount)}</td>
  <td class="r">${n(p.platformCommission)}</td>
  <td class="r">${n(p.royaltyPaid)}</td>
  <td class="r">${n(p.netReceived)}</td>
</tr>`).join("")}
<tr class="tot">
  <td colspan="3">TOTAL (${payouts.length} sale${payouts.length !== 1 ? "s" : ""})</td>
  <td class="r">${n(totals.saleAmount)}</td>
  <td class="r">${n(totals.platformCommission)}</td>
  <td class="r">${n(totals.royaltyPaid)}</td>
  <td class="r">${n(totals.netReceived)}</td>
</tr>
</tbody></table>
</body></html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 300);
  }
}

// ── Monthly bar chart (CSS, no library) ──────────────────────────────────────

function MonthlyChart({ data }: { data: Monthly[] }) {
  const maxNet = Math.max(...data.map((d) => d.netReceived), 1);
  return (
    <div className="space-y-3">
      {data.map((m) => (
        <div key={m.month}>
          <div className="flex items-baseline justify-between text-xs mb-1 gap-2">
            <span className="text-gray-700 font-semibold w-14 flex-shrink-0">{monthLabel(m.month)}</span>
            <span className="text-gray-400 flex-shrink-0">{m.count} sale{m.count !== 1 ? "s" : ""}</span>
            <span className="font-bold text-primary ml-auto">{fmt(m.netReceived)}</span>
          </div>
          <div className="flex gap-1 h-4">
            {/* Gross bar */}
            <div className="flex-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.max((m.netReceived / maxNet) * 100, m.netReceived > 0 ? 3 : 0)}%`,
                  background: "linear-gradient(90deg,#1A6659,#2D9B82)",
                }}
              />
            </div>
            {/* Commission segment */}
            <div
              className="h-full rounded-full bg-red-200 flex-shrink-0"
              style={{ width: `${Math.max((m.platformCommission / (m.saleAmount || 1)) * 60, 2)}px` }}
              title={`Commission: ${fmt(m.platformCommission)}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Summary card ──────────────────────────────────────────────────────────────

function Card({
  label, value, sub, color,
}: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SellerPayoutsPage() {
  const defaultFrom = isoToDateInput(new Date(Date.now() - 90 * 24 * 3_600_000));
  const defaultTo   = isoToDateInput(new Date());

  const [from,    setFrom]    = useState(defaultFrom);
  const [to,      setTo]      = useState(defaultTo);
  const [storyId, setStoryId] = useState("");
  const [data,    setData]    = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const PAGE_SIZE = 25;

  const appliedFrom    = useRef(defaultFrom);
  const appliedTo      = useRef(defaultTo);
  const appliedStoryId = useRef("");

  const load = useCallback(async (f: string, t: string, sid: string) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ from: f, to: t });
      if (sid) p.set("storyId", sid);
      const res = await fetch(`/api/seller/payouts?${p}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(defaultFrom, defaultTo, ""); }, [load, defaultFrom, defaultTo]);

  function applyFilters() {
    appliedFrom.current    = from;
    appliedTo.current      = to;
    appliedStoryId.current = storyId;
    setPage(1);
    load(from, to, storyId);
  }

  function resetFilters() {
    setFrom(defaultFrom);
    setTo(defaultTo);
    setStoryId("");
    appliedFrom.current    = defaultFrom;
    appliedTo.current      = defaultTo;
    appliedStoryId.current = "";
    setPage(1);
    load(defaultFrom, defaultTo, "");
  }

  const payouts = data?.payouts ?? [];
  const totals  = data?.totals  ?? { saleAmount: 0, platformCommission: 0, royaltyPaid: 0, netReceived: 0 };
  const monthly = data?.monthly ?? [];
  const stories = data?.stories ?? [];

  const totalPages  = Math.max(1, Math.ceil(payouts.length / PAGE_SIZE));
  const visibleRows = payouts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 pb-20">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Your Payouts</h1>
          <p className="text-sm text-gray-400 mt-0.5">Story sale earnings, commissions, and net received</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => data && downloadCsv(payouts, totals, appliedFrom.current, appliedTo.current)}
            disabled={!data || payouts.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            CSV
          </button>
          <button
            onClick={() => data && downloadPdf(payouts, totals, appliedFrom.current, appliedTo.current)}
            disabled={!data || payouts.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M9 13h6M9 17h6M9 9h1" />
            </svg>
            PDF
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">From</label>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">To</label>
            <input
              type="date"
              value={to}
              min={from}
              max={isoToDateInput(new Date())}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-xs text-gray-400 font-medium">Story</label>
            <select
              value={storyId}
              onChange={(e) => setStoryId(e.target.value)}
              className="h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white"
            >
              <option value="">All stories</option>
              {stories.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
          <button
            onClick={applyFilters}
            className="h-9 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
          >
            Apply
          </button>
          <button
            onClick={resetFilters}
            className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-500 hover:text-primary transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Summary cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card label="Total Sales"          value={fmt(totals.saleAmount)}         sub={`${payouts.length} transactions`} color="text-gray-900" />
            <Card label="Platform Commission"  value={fmt(totals.platformCommission)} sub="Deducted from gross"              color="text-red-500" />
            <Card label="Royalty Out"          value={fmt(totals.royaltyPaid)}        sub="To referral distributors"         color="text-amber-500" />
            <Card label="Net Received"         value={fmt(totals.netReceived)}        sub="Credited to your wallet"          color="text-primary" />
          </div>

          {/* ── Monthly summary + chart ── */}
          {monthly.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Chart */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">
                  Net Received by Month
                </p>
                {monthly.length > 0
                  ? <MonthlyChart data={monthly} />
                  : <p className="text-sm text-gray-400 text-center py-8">No data</p>}
                <div className="flex gap-4 mt-4 pt-4 border-t border-gray-50 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded-full bg-gradient-to-r from-primary to-primary-light" />
                    Net Received
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded-full bg-red-200" />
                    Commission
                  </span>
                </div>
              </div>

              {/* Monthly table */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Monthly Summary</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[380px]">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                        <th className="px-5 py-2.5 text-left font-semibold">Month</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Sales</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Commission</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {monthly.map((m) => (
                        <tr key={m.month} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-5 py-2.5 font-semibold text-gray-700">{monthLabel(m.month)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{fmt(m.saleAmount)}</td>
                          <td className="px-4 py-2.5 text-right text-red-500">−{fmt(m.platformCommission)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-primary">{fmt(m.netReceived)}</td>
                        </tr>
                      ))}
                      {/* Total row */}
                      <tr className="border-t-2 border-primary/20 bg-primary/5">
                        <td className="px-5 py-2.5 font-bold text-gray-800">Total</td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-800">{fmt(totals.saleAmount)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-red-600">−{fmt(totals.platformCommission)}</td>
                        <td className="px-4 py-2.5 text-right font-black text-primary">{fmt(totals.netReceived)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Detail table ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Transaction Detail
                {payouts.length > 0 && <span className="ml-2 text-gray-300 font-normal normal-case">({payouts.length} records)</span>}
              </p>
              {totalPages > 1 && (
                <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
              )}
            </div>

            {payouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-gray-300">
                    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-500">No payouts in this period</p>
                <p className="text-xs text-gray-400 mt-1">Adjust your date range or story filter</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                        <th className="px-5 py-3 text-left font-semibold">Date</th>
                        <th className="px-4 py-3 text-left font-semibold">Story / Episode</th>
                        <th className="px-4 py-3 text-left font-semibold">Type</th>
                        <th className="px-4 py-3 text-right font-semibold">Sale Amount</th>
                        <th className="px-4 py-3 text-right font-semibold">Commission</th>
                        <th className="px-4 py-3 text-right font-semibold">Royalty Out</th>
                        <th className="px-4 py-3 text-right font-semibold">Net Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {visibleRows.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-5 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtDate(p.date)}</td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <p className="font-medium text-gray-800 truncate text-sm">{p.storyTitle}</p>
                          </td>
                          <td className="px-4 py-3">
                            {p.isCollab ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">Collab</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-700">Author</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 font-medium whitespace-nowrap">{fmt(p.saleAmount)}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <span className="text-red-500 font-medium">−{fmt(p.platformCommission)}</span>
                            <span className="text-gray-300 text-xs ml-1">({p.commissionPct}%)</span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {p.royaltyPaid > 0 ? (
                              <>
                                <span className="text-amber-500 font-medium">−{fmt(p.royaltyPaid)}</span>
                                <span className="text-gray-300 text-xs ml-1">({p.royaltyPct}%)</span>
                              </>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-primary whitespace-nowrap">{fmt(p.netReceived)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Footer totals */}
                    {page === totalPages && (
                      <tfoot>
                        <tr className="border-t-2 border-primary/20 bg-primary/5">
                          <td colSpan={3} className="px-5 py-3 font-bold text-gray-700 text-sm">
                            Total ({payouts.length} sale{payouts.length !== 1 ? "s" : ""})
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(totals.saleAmount)}</td>
                          <td className="px-4 py-3 text-right font-bold text-red-600">−{fmt(totals.platformCommission)}</td>
                          <td className="px-4 py-3 text-right font-bold text-amber-600">
                            {totals.royaltyPaid > 0 ? `−${fmt(totals.royaltyPaid)}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-primary">{fmt(totals.netReceived)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-1.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:border-primary hover:text-primary disabled:opacity-40 transition-colors"
                    >
                      ← Previous
                    </button>
                    <span className="text-xs text-gray-400">
                      {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, payouts.length)} of {payouts.length}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-1.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:border-primary hover:text-primary disabled:opacity-40 transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
