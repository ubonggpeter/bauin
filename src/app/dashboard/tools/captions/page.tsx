"use client";
import { useCallback, useEffect, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

type EpisodeOption = {
  id:            string;
  title:         string;
  episodeNumber: number;
  description:   string | null;
  textContent:   string | null;
};

type EpisodeGroup = {
  storyId:    string;
  storyTitle: string;
  episodes:   EpisodeOption[];
};

type Caption = {
  hook:      string;
  tease:     string;
  cta:       string;
  full:      string;
  hashtags?: string;
};

type CaptionSet = {
  tiktok:    Caption;
  instagram: Caption;
  twitter:   Caption;
};

// ── Platform card ──────────────────────────────────────────────────────────────

const PLATFORMS = [
  {
    key:      "tiktok" as const,
    label:    "TikTok",
    icon:     (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z" />
      </svg>
    ),
    gradient: "from-[#010101] to-[#EE1D52]",
    accent:   "#EE1D52",
    bg:       "bg-gradient-to-br from-black to-[#EE1D52]",
  },
  {
    key:      "instagram" as const,
    label:    "Instagram",
    icon:     (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
    gradient: "from-[#405DE6] via-[#C13584] to-[#FCAF45]",
    accent:   "#C13584",
    bg:       "bg-gradient-to-br from-[#405DE6] via-[#C13584] to-[#FCAF45]",
  },
  {
    key:      "twitter" as const,
    label:    "X (Twitter)",
    icon:     (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.74-8.851L1.254 2.25H8.08l4.259 5.629 5.905-5.629zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    gradient: "from-[#000000] to-[#1D9BF0]",
    accent:   "#1D9BF0",
    bg:       "bg-gradient-to-br from-black to-[#14171A]",
  },
] as const;

// ── Copy hook ─────────────────────────────────────────────────────────────────

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }
  return { copy, copied };
}

// ── Platform card ──────────────────────────────────────────────────────────────

function PlatformCard({
  platform,
  caption,
  copied,
  onCopy,
}: {
  platform: typeof PLATFORMS[number];
  caption:  Caption;
  copied:   string | null;
  onCopy:   (text: string, key: string) => void;
}) {
  const isCopied = copied === platform.key;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className={`${platform.bg} px-4 py-3 flex items-center gap-2`}>
        <span className="text-white">{platform.icon}</span>
        <span className="text-white font-bold text-sm">{platform.label}</span>
      </div>

      {/* Caption body */}
      <div className="px-4 py-4 flex-1 space-y-3">
        {/* Hook */}
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Hook</span>
          <p className="text-sm font-bold text-text-dark mt-0.5 leading-snug">{caption.hook}</p>
        </div>

        {/* Tease */}
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Story Tease</span>
          <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{caption.tease}</p>
        </div>

        {/* CTA */}
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">CTA</span>
          <p className="text-xs font-semibold text-primary mt-0.5 bg-primary/5 border border-primary/20 rounded-lg px-2 py-1.5">
            {caption.cta}
          </p>
        </div>

        {/* Hashtags (Instagram) */}
        {caption.hashtags && (
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Hashtags</span>
            <p className="text-xs text-gray-400 mt-0.5">{caption.hashtags}</p>
          </div>
        )}
      </div>

      {/* Copy button */}
      <div className="px-4 pb-4">
        <button
          onClick={() => onCopy(caption.full + (caption.hashtags ? "\n" + caption.hashtags : ""), platform.key)}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            isCopied
              ? "bg-green-500 text-white"
              : "bg-primary text-white hover:bg-primary-dark"
          }`}
        >
          {isCopied ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy Caption
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden animate-pulse">
      <div className="h-12 bg-gray-300" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-4/5" />
        <div className="h-3 bg-gray-100 rounded w-1/3 mt-3" />
        <div className="h-12 bg-gray-100 rounded" />
        <div className="h-9 bg-gray-100 rounded-xl mt-4" />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CaptionsPage() {
  const [groups,     setGroups]     = useState<EpisodeGroup[]>([]);
  const [episodeId,  setEpisodeId]  = useState("");
  const [captions,   setCaptions]   = useState<CaptionSet | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [fetching,   setFetching]   = useState(true);
  const [error,      setError]      = useState("");
  const { copy, copied } = useCopy();

  useEffect(() => {
    fetch("/api/tools/episodes")
      .then((r) => r.json())
      .then((d) => {
        setGroups(d.groups ?? []);
        const first = d.groups?.[0]?.episodes?.[0]?.id;
        if (first) setEpisodeId(first);
      })
      .finally(() => setFetching(false));
  }, []);

  const generate = useCallback(async () => {
    if (!episodeId) return;
    setLoading(true);
    setError("");
    setCaptions(null);
    const res  = await fetch("/api/tools/captions", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ episodeId }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setCaptions(data.captions);
    else setError(data.error ?? "Generation failed");
  }, [episodeId]);

  // Find selected episode title for context pill
  let selectedLabel = "";
  for (const g of groups) {
    const ep = g.episodes.find((e) => e.id === episodeId);
    if (ep) { selectedLabel = `${g.storyTitle} · Ep ${ep.episodeNumber}`; break; }
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 pb-24 lg:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-dark">Caption Generator</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Generate TikTok, Instagram & Twitter captions with hook, tease, and quiz CTA
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-border p-4 shadow-sm space-y-3">
        <label className="text-xs font-semibold text-gray-600 block">Select Episode</label>

        {fetching ? (
          <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
        ) : (
          <select
            value={episodeId}
            onChange={(e) => { setEpisodeId(e.target.value); setCaptions(null); }}
            className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white text-text-dark font-medium"
          >
            <option value="">— choose an episode —</option>
            {groups.map((g) => (
              <optgroup key={g.storyId} label={g.storyTitle}>
                {g.episodes.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    Ep {ep.episodeNumber}: {ep.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}

        <button
          onClick={generate}
          disabled={!episodeId || loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-dark disabled:opacity-40 transition-colors"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2a10 10 0 0110 10" /></svg>
              Claude is writing…
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              Generate Captions
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Episode context pill */}
      {(loading || captions) && selectedLabel && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Captions for:</span>
          <span className="text-xs font-semibold text-primary bg-primary/8 border border-primary/20 px-2.5 py-1 rounded-full">
            {selectedLabel}
          </span>
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {/* Result cards */}
      {captions && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLATFORMS.map((p) => (
            <PlatformCard
              key={p.key}
              platform={p}
              caption={captions[p.key]}
              copied={copied}
              onCopy={copy}
            />
          ))}
        </div>
      )}
    </div>
  );
}
