"use client";
import { useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────
type WorkerRecruit = {
  id: string; referredId: string; referredName: string;
  joinedAt: string; totalBonus: number;
};
type ViewerRecruit = {
  id: string; referredId: string; referredName: string;
  recruitsCount: number; unlockThreshold: number;
  earningsUnlocked: boolean; lockedAmount: number; unlockedAmount: number;
};
type ReferralData = {
  userId: string; referralCode: string;
  workerPaymentPct: number; viewerPct: number; viewerUnlockThreshold: number;
  totalViewerRecruits: number; workerTotalEarned: number;
  viewerTotalLocked: number; viewerTotalUnlocked: number;
  workerReferrals: WorkerRecruit[];
  viewerReferrals: ViewerRecruit[];
};

// ── Circular progress ─────────────────────────────────────────────
function CircularProgress({ value, max }: { value: number; max: number }) {
  const r   = 54;
  const circ = 2 * Math.PI * r;
  const pct  = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circ * (1 - pct);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke="#1A6659" strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-text-dark">{value}</span>
        <span className="text-xs text-gray-400 font-medium">/ {max}</span>
        <span className="text-[10px] text-gray-400 mt-0.5">recruits</span>
      </div>
    </div>
  );
}

// ── Copy link card ────────────────────────────────────────────────
function LinkCard({ label, link, description }: { label: string; link: string; description: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function share() {
    if (navigator.share) {
      navigator.share({ title: "Join BAUIN", text: description, url: link }).catch(() => {});
    } else {
      copy();
    }
  }

  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-center gap-2 bg-bg-light rounded-xl px-4 py-3 mb-4">
        <span className="flex-1 text-sm text-text-dark truncate font-mono">{link}</span>
      </div>
      <p className="text-xs text-gray-500 mb-4">{description}</p>
      <div className="flex gap-3">
        <button
          onClick={copy}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-primary-dark transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          {copied ? "Copied!" : "Copy Link"}
        </button>
        <button
          onClick={share}
          className="flex-1 flex items-center justify-center gap-2 bg-gold/10 text-gold border border-gold/30 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-gold/20 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share
        </button>
      </div>
    </div>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-bg-light rounded-xl p-4 text-center">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-black text-text-dark">{value}</p>
      {sub && <p className="text-[11px] text-primary mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────
export default function ReferralPage() {
  const [tab, setTab]     = useState<"worker" | "viewer">("worker");
  const [data, setData]   = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/referral")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const base = typeof window !== "undefined" ? window.location.origin : "";
  const workerLink = data ? `${base}/register?ref=${data.referralCode}` : "";
  const viewerLink = data ? `${base}/quiz?viewerRef=${data.userId}` : "";

  return (
    <div className="min-h-screen bg-bg-light">
      {/* Header */}
      <div className="bg-white border-b border-border px-6 py-5">
        <h1 className="text-xl font-bold text-text-dark">Referrals</h1>
        <p className="text-sm text-gray-500 mt-0.5">Earn by growing your network</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex bg-white border border-border rounded-2xl p-1.5 gap-1">
          {(["worker", "viewer"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors capitalize ${
                tab === t
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-500 hover:text-text-dark"
              }`}
            >
              {t === "worker" ? "Worker Referrals" : "Viewer Referrals"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <div className="text-center py-16 text-gray-400 text-sm">Failed to load referral data.</div>
        ) : tab === "worker" ? (
          /* ── Worker tab ── */
          <div className="space-y-5">
            <LinkCard
              label="Your Worker Referral Link"
              link={workerLink}
              description={`Anyone who registers via this link becomes your recruit. You earn ${data.workerPaymentPct}% of every purchase they make.`}
            />

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Total Recruits"  value={String(data.workerReferrals.length)} />
              <Stat label="Bonus Earned"    value={`₦${data.workerTotalEarned.toLocaleString()}`} sub={`${data.workerPaymentPct}% per purchase`} />
              <Stat label="Active"          value={String(data.workerReferrals.length)} sub="All time" />
            </div>

            {/* Recruits table */}
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-semibold text-text-dark text-sm">Recruits</h3>
              </div>
              {data.workerReferrals.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#1A6659" strokeWidth={2} className="w-6 h-6">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87" />
                      <path d="M16 3.13a4 4 0 010 7.75" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">No recruits yet.</p>
                  <p className="text-gray-400 text-xs mt-1">Share your link to start earning.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-bg-light text-gray-400 text-xs uppercase tracking-wide">
                        <th className="px-5 py-3 text-left font-medium">Name</th>
                        <th className="px-5 py-3 text-left font-medium">Joined</th>
                        <th className="px-5 py-3 text-right font-medium">Bonus Earned</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.workerReferrals.map((r) => (
                        <tr key={r.id} className="hover:bg-bg-light/60 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                                {r.referredName.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-text-dark">{r.referredName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-gray-500">
                            {new Date(r.joinedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className={`font-semibold ${r.totalBonus > 0 ? "text-primary" : "text-gray-400"}`}>
                              {r.totalBonus > 0 ? `+₦${r.totalBonus.toLocaleString()}` : "₦0"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Viewer tab ── */
          <div className="space-y-5">
            <LinkCard
              label="Your Viewer Referral Link"
              link={viewerLink}
              description={`Share quiz events via this link. You earn ${data.viewerPct}% of each entry fee as locked rewards. Unlock when you reach ${data.viewerUnlockThreshold} recruits.`}
            />

            {/* Circular progress + stats */}
            <div className="bg-white border border-border rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <CircularProgress value={data.totalViewerRecruits} max={data.viewerUnlockThreshold} />
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <Stat
                    label="Locked Earnings"
                    value={`₦${data.viewerTotalLocked.toLocaleString()}`}
                    sub="Pending unlock"
                  />
                  <Stat
                    label="Unlocked Earnings"
                    value={`₦${data.viewerTotalUnlocked.toLocaleString()}`}
                    sub="Credited to wallet"
                  />
                  <Stat label="Unique Recruits"  value={String(data.totalViewerRecruits)} />
                  <Stat label="Bonus Rate"        value={`${data.viewerPct}%`} sub="of entry fee" />
                </div>
              </div>

              {/* Unlock progress bar */}
              <div className="mt-5 pt-5 border-t border-border">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>Unlock progress</span>
                  <span className="font-semibold text-text-dark">
                    {data.totalViewerRecruits} / {data.viewerUnlockThreshold} recruits
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(data.totalViewerRecruits / data.viewerUnlockThreshold * 100, 100)}%` }}
                  />
                </div>
                {data.totalViewerRecruits < data.viewerUnlockThreshold ? (
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    {data.viewerUnlockThreshold - data.totalViewerRecruits} more recruit{data.viewerUnlockThreshold - data.totalViewerRecruits !== 1 ? "s" : ""} needed to unlock ₦{data.viewerTotalLocked.toLocaleString()}
                  </p>
                ) : (
                  <p className="text-[11px] text-primary font-semibold mt-1.5">Threshold reached — earnings unlocked!</p>
                )}
              </div>
            </div>

            {/* Recruits list */}
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-semibold text-text-dark text-sm">Viewer Recruits</h3>
              </div>
              {data.viewerReferrals.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#F0B429" strokeWidth={2} className="w-6 h-6">
                      <path d="M1 6s2 3 7 3 7-3 7-3" /><path d="M1 10s2 3 7 3 7-3 7-3" />
                      <path d="M1 14s2 3 7 3 7-3 7-3" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">No viewer recruits yet.</p>
                  <p className="text-gray-400 text-xs mt-1">Share your quiz link to get started.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {data.viewerReferrals.map((r) => (
                    <li key={r.id} className="px-5 py-4 flex items-center gap-4 hover:bg-bg-light/60 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold text-sm flex-shrink-0">
                        {r.referredName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text-dark text-sm truncate">{r.referredName}</p>
                        <p className="text-xs text-gray-400">{r.recruitsCount} quiz entr{r.recruitsCount !== 1 ? "ies" : "y"}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {r.earningsUnlocked ? (
                          <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Unlocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-gold/10 text-gold text-xs font-semibold px-2.5 py-1 rounded-full">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                            ₦{r.lockedAmount.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
