"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

type LbEntry = {
  rank: number; userId: string; name: string;
  avatarUrl: string | null; userRank: string; score: number;
};

type Prize = { rank: number; label: string; amount: number; color: string };

type Achievement = {
  key: string; name: string; description: string; icon: string;
  earned: boolean; earnedAt: string | null;
};

type CompetitionsData = {
  leaderboard:       LbEntry[];
  userRank:          { rank: number; score: number } | null;
  prizes:            Prize[];
  prizePool:         number;
  resetAt:           string;
  secondsUntilReset: number;
  lastWeekWinners:   { userId: string; name: string; rank: number; score: number; prize: number }[] | null;
};

type AchievementsData = {
  achievements: Achievement[];
  earnedCount:  number;
  totalCount:   number;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtNaira(n: number) {
  return `₦${n.toLocaleString("en-NG")}`;
}

function fmtCountdown(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function rankLabel(r: string) {
  const map: Record<string, string> = {
    MEMBER: "Member", BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold",
    PLATINUM: "Platinum", DIAMOND: "Diamond", BILLIONAIRE: "Billionaire", BILLIONAIRE_ELITE: "Elite",
  };
  return map[r] ?? r;
}

function medalColor(rank: number) {
  if (rank === 1) return "#F0B429";
  if (rank === 2) return "#9CA3AF";
  if (rank === 3) return "#CD7F32";
  return "#6B7280";
}

// ── Countdown timer ────────────────────────────────────────────────────────────

function Countdown({ initialSec }: { initialSec: number }) {
  const [sec, setSec] = useState(initialSec);
  useEffect(() => {
    const id = setInterval(() => setSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono font-bold text-primary tabular-nums">{fmtCountdown(sec)}</span>;
}

// ── Leaderboard tab ────────────────────────────────────────────────────────────

function LeaderboardTab({ data, userId }: { data: CompetitionsData; userId?: string }) {
  return (
    <div className="space-y-4">
      {/* Prize row */}
      <div className="grid grid-cols-3 gap-3">
        {data.prizes.map((p) => (
          <div key={p.rank} className="bg-white rounded-2xl border border-border p-4 text-center shadow-sm">
            <div className="text-2xl mb-1">{p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : "🥉"}</div>
            <p className="text-[11px] text-gray-500 font-medium">{p.label}</p>
            <p className="text-lg font-black mt-0.5" style={{ color: p.color }}>{fmtNaira(p.amount)}</p>
          </div>
        ))}
      </div>

      {/* Countdown */}
      <div className="bg-primary/5 border border-primary/10 rounded-2xl px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-600 font-medium">Resets in</span>
        <Countdown initialSec={data.secondsUntilReset} />
      </div>

      {/* Your rank card */}
      {data.userRank ? (
        <div className="bg-primary rounded-2xl p-4 text-white flex items-center gap-4 shadow-md">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-black">#{data.userRank.rank}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary-light font-medium">Your Rank</p>
            <p className="font-bold">#{data.userRank.rank} — {data.userRank.score.toLocaleString()} pts</p>
            {data.userRank.rank <= 3 && (
              <p className="text-xs text-gold mt-0.5 font-semibold">
                You're in prize position! Keep playing.
              </p>
            )}
          </div>
          <div className="text-3xl">{data.userRank.rank <= 3 ? "🏆" : "🎮"}</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border p-4 text-center shadow-sm">
          <p className="text-sm text-gray-400">Play quizzes this week to appear on the leaderboard</p>
        </div>
      )}

      {/* Top 10 list */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-text-dark">Weekly Top 10</p>
        </div>
        {data.leaderboard.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400 text-sm">No entries yet this week. Be the first!</p>
          </div>
        ) : (
          <ul>
            {data.leaderboard.map((entry, i) => {
              const isMe = entry.userId === userId;
              return (
                <li
                  key={entry.userId}
                  className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-gray-50" : ""} ${isMe ? "bg-primary/5" : ""}`}
                >
                  {/* Rank badge */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black"
                    style={{ background: entry.rank <= 3 ? `${medalColor(entry.rank)}22` : "#F3F4F6", color: medalColor(entry.rank) }}
                  >
                    {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank - 1] : `#${entry.rank}`}
                  </div>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                    {entry.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + rank */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isMe ? "text-primary" : "text-text-dark"}`}>
                      {entry.name}{isMe && " (you)"}
                    </p>
                    <p className="text-[11px] text-gray-400">{rankLabel(entry.userRank)}</p>
                  </div>

                  {/* Score */}
                  <span className="text-sm font-bold text-text-dark tabular-nums">
                    {entry.score.toLocaleString()} pts
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Last week's winners */}
      {data.lastWeekWinners && data.lastWeekWinners.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Last Week's Winners</p>
          <div className="space-y-2">
            {data.lastWeekWinners.map((w) => (
              <div key={w.userId} className="flex items-center gap-3">
                <span className="text-lg">{["🥇","🥈","🥉"][w.rank - 1]}</span>
                <span className="flex-1 text-sm font-medium text-text-dark">{w.name}</span>
                <span className="text-sm font-bold text-primary">{fmtNaira(w.prize)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Achievements tab ───────────────────────────────────────────────────────────

function AchievementsTab({ data }: { data: AchievementsData }) {
  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-text-dark">Achievements Earned</p>
          <p className="text-sm font-bold text-primary">{data.earnedCount}/{data.totalCount}</p>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${(data.earnedCount / data.totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Achievement grid */}
      <div className="grid grid-cols-2 gap-3">
        {data.achievements.map((ach) => (
          <div
            key={ach.key}
            className={`bg-white rounded-2xl border p-4 shadow-sm transition-all ${
              ach.earned
                ? "border-primary/30 bg-primary/2"
                : "border-border opacity-60 grayscale"
            }`}
          >
            <div className="text-3xl mb-2">{ach.icon}</div>
            <p className={`text-sm font-bold leading-tight ${ach.earned ? "text-text-dark" : "text-gray-400"}`}>
              {ach.name}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{ach.description}</p>
            {ach.earned && ach.earnedAt && (
              <p className="text-[10px] text-primary font-medium mt-1.5">
                Earned {new Date(ach.earnedAt).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            )}
            {!ach.earned && (
              <p className="text-[10px] text-gray-300 font-medium mt-1.5 uppercase tracking-wide">Locked</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CompetitionsPage() {
  const [tab,          setTab]          = useState<"leaderboard" | "achievements">("leaderboard");
  const [compData,     setCompData]     = useState<CompetitionsData | null>(null);
  const [achData,      setAchData]      = useState<AchievementsData | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [userId,       setUserId]       = useState<string | undefined>();
  const streakCalled   = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [compRes, achRes, sessionRes] = await Promise.all([
      fetch("/api/competitions"),
      fetch("/api/achievements"),
      fetch("/api/auth/session"),
    ]);

    const [comp, ach, sessionData] = await Promise.all([
      compRes.json(),
      achRes.json(),
      sessionRes.json(),
    ]);

    setCompData(comp);
    setAchData(ach);
    setUserId(sessionData?.user?.id);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    // Fire streak update once per browser session
    if (!streakCalled.current) {
      streakCalled.current = true;
      fetch("/api/auth/streak", { method: "POST" }).catch(() => {});
    }
  }, [load]);

  const tabs = [
    { key: "leaderboard",   label: "Leaderboard",  icon: "🏆" },
    { key: "achievements",  label: "Achievements",  icon: "🎖" },
  ] as const;

  return (
    <div className="p-4 lg:p-8 space-y-5 pb-24 lg:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-dark">Competitions</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Compete weekly, earn prizes, unlock achievements
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
              tab === t.key
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-border h-20 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {tab === "leaderboard" && compData && (
            <LeaderboardTab data={compData} userId={userId} />
          )}
          {tab === "achievements" && achData && (
            <AchievementsTab data={achData} />
          )}
        </>
      )}
    </div>
  );
}
