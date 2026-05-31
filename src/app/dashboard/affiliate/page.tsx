"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface Referral {
  id:          string;
  bonusPaid:   boolean;
  bonusPaidAt: string | null;
  createdAt:   string;
  referredUser: { name: string; createdAt: string };
}

interface DashData {
  promoCode:        string;
  earningsTotal:    number;
  bonusPerReg:      number;
  totalReferrals:   number;
  paidReferrals:    number;
  pendingReferrals: number;
  referrals:        Referral[];
  joinedAt:         string;
}

const ngn = (n: number) => `₦${n.toLocaleString("en-NG")}`;
const fmt = (d: string) => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
        copied ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-border rounded-2xl px-5 py-5">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-black text-text-dark leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
    </div>
  );
}

export default function AffiliateDashboardPage() {
  const [data,    setData]    = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const originRef = useRef("");

  useEffect(() => {
    originRef.current = window.location.origin;
    fetch("/api/affiliate/dashboard")
      .then((r) => {
        if (r.status === 403 || r.status === 404) throw new Error("not_affiliate");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message === "not_affiliate" ? "not_affiliate" : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error === "not_affiliate") {
    return (
      <div className="max-w-lg mx-auto py-20 px-4 text-center">
        <p className="text-4xl mb-4">🔒</p>
        <h2 className="text-2xl font-black text-text-dark mb-2">Not an affiliate yet</h2>
        <p className="text-gray-500 text-sm mb-6">
          Apply to the affiliate programme to get your promo link and start earning ₦2,000 per referral.
        </p>
        <Link href="/affiliate"
          className="inline-block bg-primary text-white font-black px-8 py-3 rounded-full text-sm hover:bg-primary-dark transition-colors">
          Apply Now
        </Link>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">{error || "Something went wrong."}</p>
      </div>
    );
  }

  const referralLink = `${originRef.current}/auth/register?aff=${data.promoCode}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-text-dark">Affiliate Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Earning {ngn(data.bonusPerReg)} per registration · Affiliate since {fmt(data.joinedAt)}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Earnings"   value={ngn(data.earningsTotal)} sub="Paid to wallet" />
        <StatCard label="Total Referrals"  value={String(data.totalReferrals)} />
        <StatCard label="Paid Referrals"   value={String(data.paidReferrals)} />
        <StatCard label="Bonus / Referral" value={ngn(data.bonusPerReg)} sub="Current rate" />
      </div>

      {/* Promo code + link */}
      <div className="bg-primary rounded-2xl px-6 py-6 text-white">
        <p className="text-xs font-bold text-white/60 uppercase tracking-wide mb-4">Your referral details</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 bg-white/10 rounded-xl px-4 py-3">
            <div>
              <p className="text-xs text-white/50 mb-0.5">Promo code</p>
              <p className="font-mono font-black text-xl text-gold tracking-widest">{data.promoCode}</p>
            </div>
            <CopyButton text={data.promoCode} />
          </div>

          <div className="flex items-center justify-between gap-4 bg-white/10 rounded-xl px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs text-white/50 mb-0.5">Referral link</p>
              <p className="font-mono text-xs text-white/80 truncate">{referralLink}</p>
            </div>
            <CopyButton text={referralLink} />
          </div>
        </div>
      </div>

      {/* Referrals table */}
      <div>
        <h2 className="text-lg font-black text-text-dark mb-4">
          Referrals{" "}
          <span className="text-gray-400 font-normal text-base">({data.totalReferrals})</span>
        </h2>

        {data.referrals.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl px-6 py-12 text-center">
            <p className="text-4xl mb-3">🔗</p>
            <p className="font-bold text-text-dark mb-1">No referrals yet</p>
            <p className="text-gray-500 text-sm">Share your link to start earning.</p>
          </div>
        ) : (
          <div className="bg-white border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Registered</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Bonus</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-text-dark">{r.referredUser.name}</td>
                    <td className="px-5 py-3.5 text-gray-500">{fmt(r.referredUser.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      {r.bonusPaid ? (
                        <span className="text-green-600 font-semibold text-xs">Paid {r.bonusPaidAt ? fmt(r.bonusPaidAt) : ""}</span>
                      ) : (
                        <span className="text-yellow-600 font-semibold text-xs">Pending</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-primary">₦2,000</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
