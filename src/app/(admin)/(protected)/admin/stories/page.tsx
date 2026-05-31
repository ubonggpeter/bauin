"use client";
import { useCallback, useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type EpisodeSummary = {
  id: string; title: string; episodeNumber: number;
  isPublished: boolean; textContent: string | null;
  gameContentJson: Record<string, unknown> | null;
  updatedAt: string;
};

type Story = {
  id: string; title: string; isPublished: boolean;
  _count: { episodes: number; purchases: number };
  episodes: EpisodeSummary[];
};

type AiContent = {
  flash_words: string[];
  memory_pairs: { fact: string; answer: string }[];
  sequence_events: string[];
  fill_gaps: { sentence: string; options: { A: string; B: string; C: string; D: string }; correct: string }[];
  true_false: { statement: string; answer: boolean }[];
  generatedAt?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasAiContent(ep: EpisodeSummary): boolean {
  return !!(ep.gameContentJson as Record<string, unknown> | null)?.aiContent;
}

function getAiContent(ep: EpisodeSummary): AiContent | null {
  return ((ep.gameContentJson as Record<string, unknown> | null)?.aiContent as AiContent) ?? null;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Content Preview Panel ─────────────────────────────────────────────────────

function ContentPreview({ ai }: { ai: AiContent }) {
  const [section, setSection] = useState<"flash" | "pairs" | "seq" | "gaps" | "tf">("flash");

  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap">
        {([
          ["flash", `Flash (${ai.flash_words.length})`],
          ["pairs", `Pairs (${ai.memory_pairs.length})`],
          ["seq",   `Sequence (${ai.sequence_events.length})`],
          ["gaps",  `Fill-gaps (${ai.fill_gaps.length})`],
          ["tf",    `True/False (${ai.true_false.length})`],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setSection(k)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${section === k ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-gray-50 rounded-xl p-3 space-y-2 max-h-64 overflow-y-auto text-xs">
        {section === "flash" && (
          <div className="flex flex-wrap gap-1.5">
            {ai.flash_words.map((w, i) => (
              <span key={i} className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium">{w}</span>
            ))}
          </div>
        )}

        {section === "pairs" && (
          <table className="w-full">
            <thead><tr><th className="text-left text-gray-500 font-semibold pb-1">Fact</th><th className="text-left text-gray-500 font-semibold pb-1">Answer</th></tr></thead>
            <tbody>
              {ai.memory_pairs.map((p, i) => (
                <tr key={i} className="border-t border-gray-200">
                  <td className="py-1 pr-3 text-gray-700">{p.fact}</td>
                  <td className="py-1 font-medium text-primary">{p.answer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {section === "seq" && (
          <ol className="space-y-1">
            {ai.sequence_events.map((ev, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-white font-bold flex-shrink-0 flex items-center justify-center text-[10px]">{i + 1}</span>
                <span className="text-gray-700">{ev}</span>
              </li>
            ))}
          </ol>
        )}

        {section === "gaps" && (
          <div className="space-y-3">
            {ai.fill_gaps.map((g, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-2 bg-white">
                <p className="font-medium text-gray-800 mb-1">{g.sentence}</p>
                <div className="grid grid-cols-2 gap-1">
                  {(["A", "B", "C", "D"] as const).map((opt) => (
                    <span key={opt} className={`px-2 py-0.5 rounded text-[11px] ${g.correct === opt ? "bg-green-100 text-green-700 font-semibold" : "text-gray-500"}`}>
                      {opt}: {g.options[opt]}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {section === "tf" && (
          <div className="space-y-1.5">
            {ai.true_false.map((t, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${t.answer ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {t.answer ? "T" : "F"}
                </span>
                <span className="text-gray-700">{t.statement}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {ai.generatedAt && (
        <p className="text-[10px] text-gray-400">Generated {fmtDate(ai.generatedAt)}</p>
      )}
    </div>
  );
}

// ── Episode Card ──────────────────────────────────────────────────────────────

function EpisodeCard({
  episode,
  onUpdate,
}: {
  episode: EpisodeSummary;
  onUpdate: (id: string, updated: Partial<EpisodeSummary> & { gameContentJson?: Record<string, unknown> }) => void;
}) {
  const [expanded,   setExpanded]   = useState(false);
  const [text,       setText]       = useState(episode.textContent ?? "");
  const [saving,     setSaving]     = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast,      setToast]      = useState("");
  const ai = getAiContent(episode);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function saveText() {
    setSaving(true);
    const res  = await fetch(`/api/admin/stories/episodes/${episode.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ textContent: text }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      onUpdate(episode.id, { textContent: text });
      showToast(data.regenerating ? "Saved — generating game content in background…" : "Saved.");
    }
  }

  async function generate() {
    setGenerating(true);
    const res  = await fetch(`/api/admin/stories/episodes/${episode.id}/generate`, { method: "POST" });
    const data = await res.json();
    setGenerating(false);
    if (res.ok) {
      // Refresh episode to get new gameContentJson
      const ep = await fetch(`/api/admin/stories/episodes/${episode.id}`).then((r) => r.json());
      if (ep.episode) onUpdate(episode.id, { gameContentJson: ep.episode.gameContentJson });
      showToast(`Generated! ${data.counts.flash_words} words · ${data.counts.memory_pairs} pairs`);
    } else {
      showToast(data.error ?? "Generation failed.");
    }
  }

  const textChanged = text !== (episode.textContent ?? "");

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-white">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/60 select-none"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center flex-shrink-0">
          {episode.episodeNumber}
        </span>
        <span className="flex-1 text-sm font-semibold text-text-dark truncate">{episode.title}</span>

        {hasAiContent(episode) && (
          <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full flex-shrink-0">AI ✓</span>
        )}
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${episode.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {episode.isPublished ? "Published" : "Draft"}
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expanded ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {/* Text editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-600">Episode Text Content</label>
              <span className="text-[10px] text-gray-400">{text.length.toLocaleString()} chars</span>
            </div>
            <textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the episode text here. Claude will extract game content from it…"
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y font-mono"
            />
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={saveText}
                disabled={saving || !textChanged}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-dark disabled:opacity-40 transition-colors"
              >
                {saving ? "Saving…" : "Save Text"}
                {!saving && textChanged && <span className="w-1.5 h-1.5 rounded-full bg-gold" />}
              </button>
              <button
                onClick={generate}
                disabled={generating || !episode.textContent}
                className="flex items-center gap-1.5 px-4 py-2 border border-primary text-primary text-xs font-bold rounded-xl hover:bg-primary/5 disabled:opacity-40 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`}>
                  {generating
                    ? <path d="M12 2a10 10 0 0110 10" />
                    : <><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></>
                  }
                </svg>
                {generating ? "Generating…" : "Generate Game Content"}
              </button>
              {!episode.textContent && (
                <span className="text-[10px] text-gray-400 italic">Save text first to enable generation</span>
              )}
            </div>
          </div>

          {/* Game content preview */}
          {ai ? (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Generated Game Content</p>
              <ContentPreview ai={ai} />
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400">No AI game content yet. Add episode text and click Generate.</p>
            </div>
          )}

          {toast && (
            <div className="bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-3 py-2 rounded-xl">
              {toast}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminStoriesPage() {
  const [stories,    setStories]    = useState<Story[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading,    setLoading]    = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/admin/stories");
    const data = await res.json();
    const list: Story[] = data.stories ?? [];
    setStories(list);
    if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const selected = stories.find((s) => s.id === selectedId);

  function updateEpisode(storyId: string, episodeId: string, patch: Partial<EpisodeSummary> & { gameContentJson?: Record<string, unknown> }) {
    setStories((prev) => prev.map((s) =>
      s.id !== storyId ? s : {
        ...s,
        episodes: s.episodes.map((ep) => ep.id !== episodeId ? ep : { ...ep, ...patch }),
      },
    ));
  }

  const aiCount = selected?.episodes.filter(hasAiContent).length ?? 0;
  const totalEp = selected?.episodes.length ?? 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-dark">Stories</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage episode text and AI game content generation</p>
      </div>

      {/* Story selector */}
      <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-4 shadow-sm flex-wrap">
        <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">Story</label>
        {loading ? (
          <div className="h-9 w-64 bg-gray-100 rounded-xl animate-pulse" />
        ) : (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 min-w-52 px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white font-medium text-text-dark"
          >
            {stories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} — {s._count.episodes} episodes · {s._count.purchases} purchases
              </option>
            ))}
          </select>
        )}

        {selected && (
          <>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${selected.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {selected.isPublished ? "Published" : "Draft"}
            </span>
            <span className="text-xs text-gray-500">
              {aiCount}/{totalEp} episodes have AI content
            </span>
          </>
        )}
      </div>

      {/* Episode list */}
      {!loading && selected && (
        <div className="space-y-3">
          {selected.episodes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border p-12 text-center">
              <p className="text-gray-400 text-sm">This story has no episodes yet.</p>
            </div>
          ) : (
            selected.episodes.map((ep) => (
              <EpisodeCard
                key={ep.id}
                episode={ep}
                onUpdate={(id, patch) => updateEpisode(selected.id, id, patch)}
              />
            ))
          )}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-border p-5 animate-pulse h-16" />
          ))}
        </div>
      )}
    </div>
  );
}
