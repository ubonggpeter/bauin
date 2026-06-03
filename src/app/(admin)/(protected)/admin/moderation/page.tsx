"use client";

import { useCallback, useEffect, useState } from "react";

const REASON_LABELS: Record<string, string> = {
  ADULT_CONTENT: "Adult Content",
  SCAM:          "Scam / Fraud",
  COPYRIGHT:     "Copyright",
  HATE_SPEECH:   "Hate Speech",
  OTHER:         "Other",
};

const REASON_COLORS: Record<string, string> = {
  ADULT_CONTENT: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  SCAM:          "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
  COPYRIGHT:     "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  HATE_SPEECH:   "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  OTHER:         "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
};

type Report = { id: string; reason: string; details: string | null; createdAt: string };

type StoryRow = {
  id:           string;
  title:        string;
  reportCount:  number;
  pendingCount: number;
  topReason:    string | null;
  reasonCounts: Record<string, number>;
  reports:      Report[];
  author:       {
    id:          string;
    name:        string;
    totalStrikes:number;
    isSuspended: boolean;
    isBanned:    boolean;
  } | null;
};

function StrikeIndicator({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={`w-2.5 h-2.5 rounded-full ${
            n <= count
              ? n === 1 ? "bg-yellow-400" : n === 2 ? "bg-orange-500" : "bg-red-600"
              : "bg-gray-200 dark:bg-gray-700"
          }`}
          title={`Strike ${n}`}
        />
      ))}
      <span className="text-xs text-gray-500 dark:text-gray-400 ml-0.5">{count}/3</span>
    </div>
  );
}

export default function ModerationPage() {
  const [stories,   setStories]   = useState<StoryRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [note,      setNote]      = useState("");
  const [error,     setError]     = useState<string | null>(null);
  const [success,   setSuccess]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res  = await fetch("/api/admin/moderation");
      const data = await res.json() as { stories: StoryRow[] };
      setStories(data.stories ?? []);
    } catch { setError("Failed to load moderation queue."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function doAction(storyId: string, action: "STRIKE" | "DISMISS") {
    if (action === "STRIKE" && !note.trim()) {
      setError("Add a strike note before issuing."); return;
    }
    setActioning(storyId); setError(null); setSuccess(null);
    try {
      const res = await fetch(`/api/admin/moderation/${storyId}/action`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, note: note.trim() || undefined }),
      });
      const data = await res.json() as { ok?: boolean; strikeNumber?: number; consequence?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      if (action === "STRIKE") {
        const msgs: Record<string, string> = {
          WARNING:          `Strike 1 issued — warning sent to seller.`,
          SELLER_SUSPENDED: `Strike 2 — seller suspended from selling.`,
          PERMANENT_BAN:    `Strike 3 — seller permanently banned.`,
        };
        setSuccess(msgs[data.consequence ?? ""] ?? `Strike ${data.strikeNumber} issued.`);
      } else {
        setSuccess("All pending reports dismissed.");
      }
      setNote("");
      setExpanded(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally { setActioning(null); }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Moderation Queue</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {stories.length} {stories.length === 1 ? "story" : "stories"} with pending reports
        </p>
      </div>

      {error   && <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400">{success}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-7 h-7 border-4 border-teal-600 border-t-transparent rounded-full" />
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-semibold">Queue is clear</p>
          <p className="text-sm mt-1">No stories with pending reports.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stories.map((story) => {
            const isExpanded = expanded === story.id;
            return (
              <div
                key={story.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
              >
                {/* Row summary */}
                <div className="p-5 flex items-start gap-4">
                  {/* Report count badge */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex flex-col items-center justify-center">
                    <span className="text-lg font-black text-red-600 dark:text-red-400 leading-none">{story.pendingCount}</span>
                    <span className="text-[9px] text-red-400 font-medium leading-none mt-0.5">reports</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">{story.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {story.author && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              by {story.author.name}
                            </span>
                          )}
                          {story.author?.isBanned && (
                            <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">BANNED</span>
                          )}
                          {story.author?.isSuspended && !story.author.isBanned && (
                            <span className="text-[10px] font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded">SUSPENDED</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {story.topReason && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${REASON_COLORS[story.topReason] ?? ""}`}>
                            {REASON_LABELS[story.topReason] ?? story.topReason}
                          </span>
                        )}
                        <button
                          onClick={() => setExpanded(isExpanded ? null : story.id)}
                          className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:underline"
                        >
                          {isExpanded ? "Hide" : `View ${story.reports.length}`}
                        </button>
                      </div>
                    </div>

                    {story.author && (
                      <div className="mt-2">
                        <StrikeIndicator count={story.author.totalStrikes} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-5 space-y-4">
                    {/* Individual reports */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Pending Reports</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {story.reports.map((r) => (
                          <div key={r.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${REASON_COLORS[r.reason] ?? ""}`}>
                                {REASON_LABELS[r.reason] ?? r.reason}
                              </span>
                              <span className="text-[11px] text-gray-400">
                                {new Date(r.createdAt).toLocaleDateString("en-NG")}
                              </span>
                            </div>
                            {r.details && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">&ldquo;{r.details}&rdquo;</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                          Strike note
                          <span className="font-normal lowercase ml-1 text-gray-400">(required for strike)</span>
                        </label>
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          rows={2}
                          placeholder="Explain the violation for seller notification…"
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      {/* Strike system info */}
                      <div className="flex gap-2 text-[11px] text-gray-400 dark:text-gray-500">
                        <span className="px-1.5 py-0.5 bg-yellow-50 dark:bg-yellow-900/20 rounded text-yellow-600 dark:text-yellow-500">1 = Warning</span>
                        <span className="px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/20 rounded text-orange-600 dark:text-orange-500">2 = Suspend selling</span>
                        <span className="px-1.5 py-0.5 bg-red-50 dark:bg-red-900/20 rounded text-red-600 dark:text-red-500">3 = Permanent ban</span>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => void doAction(story.id, "STRIKE")}
                          disabled={actioning === story.id || !note.trim()}
                          className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                        >
                          {actioning === story.id ? "…" : `Issue Strike ${(story.author?.totalStrikes ?? 0) + 1}`}
                        </button>
                        <button
                          onClick={() => void doAction(story.id, "DISMISS")}
                          disabled={actioning === story.id}
                          className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-300 text-sm font-semibold py-2 rounded-lg transition-colors"
                        >
                          Dismiss All
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
