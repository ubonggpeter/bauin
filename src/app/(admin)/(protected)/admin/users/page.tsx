"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  kycStatus: string;
  rank: string;
  walletBalance: string;
  isActive: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  country: string | null;
};

type ApiResponse = { users: User[]; total: number; page: number; pages: number };

const ROLES    = ["", "VIEWER", "WORKER", "DISTRIBUTOR", "SELLER", "ADMIN", "SUPER_ADMIN"];
const KYC_OPTS = ["", "PENDING", "SUBMITTED", "APPROVED", "REJECTED"];
const STATUS   = ["", "active", "inactive"];

const KYC_COLOR: Record<string, string> = {
  PENDING:   "bg-gray-100 text-gray-600",
  SUBMITTED: "bg-yellow-100 text-yellow-700",
  APPROVED:  "bg-green-100 text-green-700",
  REJECTED:  "bg-red-100 text-red-700",
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

function fmt(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(1)}K`;
  return `₦${n.toLocaleString()}`;
}

export default function AdminUsersPage() {
  const [users, setUsers]       = useState<User[]>([]);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [toast, setToast]       = useState("");

  const [q, setQ]           = useState("");
  const [role, setRole]     = useState("");
  const [kyc, setKyc]       = useState("");
  const [status, setStatus] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (overridePage?: number) => {
    setLoading(true);
    const p = overridePage ?? page;
    const params = new URLSearchParams({ page: String(p), limit: "25" });
    if (q)      params.set("q", q);
    if (role)   params.set("role", role);
    if (kyc)    params.set("kyc", kyc);
    if (status) params.set("status", status);

    const res = await fetch(`/api/admin/users?${params}`);
    const data: ApiResponse = await res.json();
    setUsers(data.users ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setPage(p);
    setSelected(new Set());
    setLoading(false);
  }, [q, role, kyc, status, page]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(1), q ? 350 : 0);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, role, kyc, status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleAll() {
    if (selected.size === users.length) setSelected(new Set());
    else setSelected(new Set(users.map((u) => u.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function runBulkAction() {
    if (!bulkAction || selected.size === 0) return;
    setBulkLoading(true);
    const res = await fetch("/api/admin/users", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: bulkAction, userIds: Array.from(selected) }),
    });
    const data = await res.json();
    setBulkLoading(false);
    if (res.ok) {
      setToast(`Done: ${data.updated} user(s) updated.`);
      setTimeout(() => setToast(""), 3000);
      load(page);
    }
  }

  const allSelected = users.length > 0 && selected.size === users.length;
  const indeterminate = selected.size > 0 && selected.size < users.length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-border p-4 flex flex-wrap gap-3 items-center shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-52">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        {/* Role */}
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="text-sm border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
        >
          <option value="">All roles</option>
          {ROLES.filter(Boolean).map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        {/* KYC */}
        <select
          value={kyc}
          onChange={(e) => setKyc(e.target.value)}
          className="text-sm border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
        >
          <option value="">All KYC</option>
          {KYC_OPTS.filter(Boolean).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-sm border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
        >
          <option value="">All status</option>
          {STATUS.filter(Boolean).map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>

        {(q || role || kyc || status) && (
          <button
            onClick={() => { setQ(""); setRole(""); setKyc(""); setStatus(""); }}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-primary">{selected.size} selected</span>
          <div className="flex-1" />
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="text-sm border border-primary/30 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            <option value="">Choose action…</option>
            <option value="approve_kyc">Approve KYC</option>
            <option value="activate">Activate</option>
            <option value="suspend">Suspend</option>
          </select>
          <button
            onClick={runBulkAction}
            disabled={!bulkAction || bulkLoading}
            className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {bulkLoading ? "Processing…" : "Apply"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50/60">
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = indeterminate; }}
                    onChange={toggleAll}
                    className="accent-primary w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">User</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">KYC</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Balance</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Joined</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Last Login</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 w-16">View</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: j === 1 ? 140 : 80 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">No users found.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className={`border-b border-border last:border-0 transition-colors ${selected.has(user.id) ? "bg-primary/5" : "hover:bg-gray-50/60"}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(user.id)}
                        onChange={() => toggleOne(user.id)}
                        className="accent-primary w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold text-xs">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-text-dark truncate max-w-40">{user.name}</p>
                          <p className="text-xs text-gray-400 truncate max-w-40">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${KYC_COLOR[user.kycStatus] ?? "bg-gray-100 text-gray-600"}`}>
                        {user.kycStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-text-dark">
                      {fmt(Number(user.walletBalance))}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-green-500" : "bg-red-500"}`} />
                        {user.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(user.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(user.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="inline-flex items-center gap-1 text-primary hover:text-primary-dark font-medium text-xs transition-colors"
                      >
                        View
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Page {page} of {pages} &middot; {total.toLocaleString()} users
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
