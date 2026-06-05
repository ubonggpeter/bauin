"use client";

import { useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type FeatureKey = "CERTIFICATION" | "WITHDRAWAL" | "QUIZ";

interface FeatureStat {
  count: number;
  avg: number;
  dist: { score: number; count: number }[];
  thumbsUpPct: number | null;
}

interface TopicWord { word: string; count: number }

interface RecentEntry {
  id: string;
  feature: FeatureKey;
  score: number;
  scoreType: "STARS" | "THUMBS" | "EMOJI";
  comment: string | null;
  userName: string;
  createdAt: string;
}

interface FeedbackData {
  byFeature: Record<FeatureKey, FeatureStat>;
  trending: Record<string, TopicWord[]>;
  recent: RecentEntry[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const FEATURES: { key: FeatureKey; label: string; icon: string }[] = [
  { key: "CERTIFICATION", label: "Certification", icon: "🎓" },
  { key: "WITHDRAWAL",    label: "Withdrawal",    icon: "💸" },
  { key: "QUIZ",          label: "Quiz",          icon: "🎮" },
];

const EMOJI_LABELS = ["", "Poor", "Okay", "Good", "Great", "Amazing"];

function ScoreDisplay({ score, scoreType }: { score: number; scoreType: string }) {
  if (scoreType === "STARS") {
    return (
      <span className="text-gold tracking-tight">
        {"★".repeat(score)}{"☆".repeat(5 - score)}
      </span>
    );
  }
  if (scoreType === "THUMBS") {
    return <span className="text-xl">{score === 5 ? "👍" : "👎"}</span>;
  }
  const emojis = ["😞", "😐", "🙂", "😄", "🤩"];
  return (
    <span className="text-xl" title={EMOJI_LABELS[score]}>
      {emojis[score - 1]}
    </span>
  );
}

function DistBar({ dist, scoreType }: { dist: { score: number; count: number }[]; scoreType: string }) {
  const max = Math.max(...dist.map((d) => d.count), 1);

  if (scoreType === "THUMBS") {
    const up   = dist.find((d) => d.score === 5)?.count ?? 0;
    const down = dist.find((d) => d.score === 1)?.count ?? 0;
    const total = up + down;
    const upPct = total > 0 ? Math.round((up / total) * 100) : 0;
    return (
      <div className="mt-3">
        <div className="flex rounded-full overflow-hidden h-3 bg-gray-100">
          <div className="bg-green-500 h-full transition-all" style={{ width: `${upPct}%` }} />
          <div className="bg-red-400 h-full flex-1 transition-all" />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>👍 {up} ({upPct}%)</span>
          <span>👎 {down} ({100 - upPct}%)</span>
        </div>
      </div>
    );
  }

  const emojis  = ["😞", "😐", "🙂", "😄", "🤩"];
  const labels  = scoreType === "EMOJI" ? emojis : ["1★", "2★", "3★", "4★", "5★"];

  return (
    <div className="mt-3 space-y-1.5">
      {dist.map((d, i) => (
        <div key={d.score} className="flex items-center gap-2">
          <span className="text-xs w-6 text-gray-400">{labels[i]}</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 w-6 text-right">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminFeedbackPage() {
  const [data, setData]       = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<FeatureKey | "OVERALL">("OVERALL");

  useEffect(() => {
    fetch("/api/admin/feedback")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-red-500">Failed to load feedback data.</div>;
  }

  const trendingWords = data.trending[tab] ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Feedback Dashboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">User ratings and comments across all features</p>
      </div>

      {/* ── Feature stat cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEATURES.map(({ key, label, icon }) => {
          const stat = data.byFeature[key];
          const scoreTypeMap = { CERTIFICATION: "STARS", WITHDRAWAL: "THUMBS", QUIZ: "EMOJI" } as const;
          return (
            <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{label}</p>
                  <p className="text-gray-400 text-xs">{stat.count} responses</p>
                </div>
                <div className="ml-auto text-right">
                  {stat.thumbsUpPct !== null ? (
                    <p className="text-2xl font-black text-primary">{stat.thumbsUpPct}%</p>
                  ) : (
                    <p className="text-2xl font-black text-primary">{stat.avg}</p>
                  )}
                  <p className="text-gray-400 text-xs">
                    {stat.thumbsUpPct !== null ? "thumbs up" : "avg score"}
                  </p>
                </div>
              </div>
              <DistBar dist={stat.dist} scoreType={scoreTypeMap[key]} />
            </div>
          );
        })}
      </div>

      {/* ── Trending topics ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-4">Trending Topics</h2>

        {/* Tab bar */}
        <div className="flex gap-1 mb-5 p-1 bg-gray-100 rounded-xl w-fit">
          {(["OVERALL", ...FEATURES.map((f) => f.key)] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === k ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {k === "OVERALL" ? "Overall" : FEATURES.find((f) => f.key === k)?.label}
            </button>
          ))}
        </div>

        {trendingWords.length === 0 ? (
          <p className="text-gray-400 text-sm">No comment data yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {trendingWords.map(({ word, count }) => {
              const max   = trendingWords[0].count;
              const size  = 0.75 + (count / max) * 0.5;
              return (
                <span
                  key={word}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/8 text-primary rounded-full font-medium"
                  style={{ fontSize: `${size}rem` }}
                >
                  {word}
                  <span className="text-primary/50 text-xs font-normal">×{count}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Recent entries ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Recent Feedback</h2>
          <p className="text-gray-400 text-xs mt-0.5">Last 50 responses</p>
        </div>

        <div className="divide-y divide-gray-50">
          {data.recent.map((entry) => {
            const featureInfo = FEATURES.find((f) => f.key === entry.feature);
            const scoreTypeMap = { CERTIFICATION: "STARS", WITHDRAWAL: "THUMBS", QUIZ: "EMOJI" } as const;
            return (
              <div key={entry.id} className="px-5 py-3.5 flex items-start gap-4">
                <div className="flex-none">
                  <ScoreDisplay score={entry.score} scoreType={scoreTypeMap[entry.feature]} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{entry.userName}</span>
                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                      {featureInfo?.icon} {featureInfo?.label}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {new Date(entry.createdAt).toLocaleDateString("en-NG", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                  </div>
                  {entry.comment && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{entry.comment}</p>
                  )}
                </div>
              </div>
            );
          })}

          {data.recent.length === 0 && (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">No feedback yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
