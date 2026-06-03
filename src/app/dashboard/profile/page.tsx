"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

// ── Types ─────────────────────────────────────────────────────────

type WorkerStatus = "AVAILABLE" | "BUSY" | "ON_LEAVE";

type AchievementItem = { key: string; name: string; icon: string };

type WorkerData = {
  workerStatus: WorkerStatus;
  achievements: AchievementItem[];
  approvedJobs: number;
  activeJobs:   number;
};

// ── Status config ─────────────────────────────────────────────────

const STATUS_CFG: Record<WorkerStatus, { label: string; dot: string; ring: string; bg: string; text: string }> = {
  AVAILABLE: { label: "Available",  dot: "bg-teal-400",   ring: "ring-teal-400/40",   bg: "bg-teal-50",   text: "text-teal-700"   },
  BUSY:      { label: "Busy",       dot: "bg-orange-400", ring: "ring-orange-400/40", bg: "bg-orange-50", text: "text-orange-700" },
  ON_LEAVE:  { label: "On Leave",   dot: "bg-gray-400",   ring: "ring-gray-400/40",   bg: "bg-gray-100",  text: "text-gray-500"   },
};

// ── Worker status card ────────────────────────────────────────────

function WorkerStatusCard({ data, onUpdate }: {
  data:     WorkerData;
  onUpdate: (s: WorkerStatus) => void;
}) {
  const [saving, setSaving] = useState(false);
  const cfg = STATUS_CFG[data.workerStatus];

  async function setStatus(status: WorkerStatus) {
    if (status === data.workerStatus || saving) return;
    setSaving(true);
    try {
      await fetch("/api/worker/status", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status }),
      });
      onUpdate(status);
    } finally {
      setSaving(false);
    }
  }

  const isReliable = data.achievements.some((a) => a.key === "RELIABLE");

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden mb-6">
      {/* Status header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot} ring-4 ${cfg.ring}`} />
        <div className="flex-1">
          <p className="text-sm font-bold text-text-dark leading-none">{cfg.label}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {data.activeJobs} active job{data.activeJobs !== 1 ? "s" : ""} · {data.approvedJobs} completed
          </p>
        </div>
        {isReliable && (
          <span className="flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            🌟 Reliable
          </span>
        )}
      </div>

      {/* Status selector */}
      <div className="flex divide-x divide-border">
        {(["AVAILABLE", "BUSY", "ON_LEAVE"] as WorkerStatus[]).map((s) => {
          const c      = STATUS_CFG[s];
          const active = s === data.workerStatus;
          return (
            <button
              key={s}
              onClick={() => setStatus(s)}
              disabled={saving}
              className={`flex-1 py-3 text-xs font-semibold transition-all flex flex-col items-center gap-1 ${
                active ? `${c.bg} ${c.text}` : "text-gray-400 hover:bg-gray-50"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${active ? c.dot : "bg-gray-300"}`} />
              {c.label}
            </button>
          );
        })}
      </div>

      {data.workerStatus === "BUSY" && data.activeJobs >= 3 && (
        <p className="text-[11px] text-orange-600 bg-orange-50 px-4 py-2 text-center">
          Auto-set Busy — complete or finish jobs to become Available again
        </p>
      )}
    </div>
  );
}

// ── Achievements display ──────────────────────────────────────────

function AchievementsSection({ achievements }: { achievements: AchievementItem[] }) {
  if (achievements.length === 0) return null;
  return (
    <div className="mb-6">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">
        Achievements
      </p>
      <div className="flex flex-wrap gap-2 px-1">
        {achievements.map((a) => (
          <span
            key={a.key}
            title={a.name}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
              a.key === "RELIABLE"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-white text-gray-700 border-border"
            }`}
          >
            {a.icon} {a.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">{title}</p>
      <div className="bg-white border border-border rounded-2xl overflow-hidden divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-3.5">{children}</div>;
}

function LinkRow({ href, label, sub }: { href: string; label: string; sub?: string }) {
  return (
    <Link href={href} className="flex items-center justify-between px-4 py-3.5 hover:bg-bg-light transition-colors">
      <div>
        <p className="text-sm font-medium text-text-dark">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-gray-400">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data: session } = useSession();
  const { theme }         = useTheme();
  const user              = session?.user;
  const isWorker          = user?.role === "WORKER";

  const [workerData, setWorkerData] = useState<WorkerData | null>(null);

  const fetchWorkerData = useCallback(async () => {
    if (!isWorker) return;
    try {
      const r = await fetch("/api/worker/status");
      if (r.ok) setWorkerData(await r.json() as WorkerData);
    } catch { /* ignore */ }
  }, [isWorker]);

  useEffect(() => { void fetchWorkerData(); }, [fetchWorkerData]);

  function handleStatusUpdate(status: WorkerStatus) {
    setWorkerData((prev) => prev ? { ...prev, workerStatus: status } : null);
  }

  return (
    <div className="min-h-screen bg-bg-light pb-24">
      <div className="max-w-lg mx-auto px-4">
        <div className="pt-8 pb-6">
          <h1 className="text-2xl font-black text-text-dark">Profile &amp; Settings</h1>
        </div>

        {/* Avatar card */}
        <div className="bg-white border border-border rounded-2xl p-5 flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-black flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            {/* Status dot overlay */}
            {isWorker && workerData && (
              <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                STATUS_CFG[workerData.workerStatus].dot
              }`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base font-bold text-text-dark truncate">{user?.name ?? "User"}</p>
              {isWorker && workerData?.achievements.some((a) => a.key === "RELIABLE") && (
                <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex-shrink-0">
                  🌟 Reliable
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">{user?.email ?? ""}</p>
            {user?.role && (
              <span className="inline-block mt-1 text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full uppercase">
                {user.role}
              </span>
            )}
          </div>
        </div>

        {/* Worker status card */}
        {isWorker && workerData && (
          <>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">
              Availability
            </p>
            <WorkerStatusCard data={workerData} onUpdate={handleStatusUpdate} />
          </>
        )}

        {/* Achievements */}
        {isWorker && workerData && workerData.achievements.length > 0 && (
          <AchievementsSection achievements={workerData.achievements} />
        )}

        {/* Appearance */}
        <Section title="Appearance">
          <Row>
            <ThemeToggle variant="row" />
          </Row>
          <Row>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-primary">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-dark">Current theme</p>
                <p className="text-xs text-gray-500 capitalize">{theme === "dark" ? "Dark mode" : "Light mode"} active</p>
              </div>
            </div>
          </Row>
        </Section>

        {/* Language */}
        <Section title="Language">
          <Row>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-primary">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                </div>
                <p className="text-sm font-semibold text-text-dark">App language</p>
              </div>
              <LanguageSwitcher variant="select" />
            </div>
          </Row>
          <Row>
            <LanguageSwitcher variant="pills" />
          </Row>
        </Section>

        {/* Account */}
        <Section title="Account">
          <LinkRow href="/dashboard/wallet" label="Wallet" sub="View balance and transactions" />
          <LinkRow href="/dashboard/referral" label="Referrals" sub="Earn by inviting friends" />
          <LinkRow href="/dashboard/stories/subscriptions" label="Story subscriptions" sub="Manage seller subscriptions" />
        </Section>

        {/* Session */}
        <Section title="Session">
          <Row>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-3 w-full text-red-500 hover:text-red-600 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <span className="text-sm font-semibold">Sign out</span>
            </button>
          </Row>
        </Section>
      </div>
    </div>
  );
}
