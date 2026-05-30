"use client";

import { useState, useRef, useCallback, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type EpisodeDraft = {
  id: string;
  number: number;
  title: string;
  description: string;
  videoFile: File | null;
  videoName: string;
  uploadPct: number;
  uploaded: boolean;
  uploading: boolean;
};

type QuizQ = {
  id: string;
  text: string;
  A: string;
  B: string;
  C: string;
  D: string;
  correct: "A" | "B" | "C" | "D";
};

type Draft = {
  title: string;
  niche: string;
  tags: string[];
  description: string;
  coverPreview: string | null;
  coverFile: File | null;
  episodes: EpisodeDraft[];
  quiz: QuizQ[];
  isFree: boolean;
  price: string;
  royaltyEnabled: boolean;
  royaltyPct: number;
};

type SubmitResult = {
  approved: boolean;
  decision: string;
  storyId?: string;
};

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────

const NICHES = ["Business", "AI & Tech", "Finance", "Romance", "Self-Help", "Crypto", "Mystery"];

const STEPS = [
  { label: "Details" },
  { label: "Episodes" },
  { label: "Quiz" },
  { label: "Pricing" },
  { label: "Review" },
];

function uid() {
  return Math.random().toString(36).slice(2);
}

function blankEpisode(number: number): EpisodeDraft {
  return { id: uid(), number, title: "", description: "", videoFile: null, videoName: "", uploadPct: 0, uploaded: false, uploading: false };
}

function blankQuestion(): QuizQ {
  return { id: uid(), text: "", A: "", B: "", C: "", D: "", correct: "A" };
}

const INITIAL: Draft = {
  title: "",
  niche: "",
  tags: [],
  description: "",
  coverPreview: null,
  coverFile: null,
  episodes: [blankEpisode(1)],
  quiz: [blankQuestion()],
  isFree: false,
  price: "1500",
  royaltyEnabled: false,
  royaltyPct: 15,
};

// ─────────────────────────────────────────────────────────────────
// Shared UI helpers
// ─────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-text-dark mb-1.5 uppercase tracking-wide">{children}</p>;
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm text-text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm text-text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
    />
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex items-center gap-3 w-full"
    >
      <div
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${on ? "bg-primary" : "bg-gray-200"}`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : "translate-x-0"}`}
        />
      </div>
      <span className="text-sm font-medium text-text-dark">{label}</span>
    </button>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 flex-shrink-0">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 1 — Details
// ─────────────────────────────────────────────────────────────────

function Step1Details({ draft, update }: { draft: Draft; update: (p: Partial<Draft>) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tagInput, setTagInput] = useState("");

  function pickCover(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    update({ coverFile: f, coverPreview: url });
  }

  function addTag() {
    const t = tagInput.trim().replace(/^#/, "");
    if (!t || draft.tags.includes(t)) return;
    update({ tags: [...draft.tags, t] });
    setTagInput("");
  }

  function removeTag(tag: string) {
    update({ tags: draft.tags.filter((t) => t !== tag) });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Cover upload */}
      <div>
        <Label>Cover Image</Label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative w-full aspect-[16/7] rounded-2xl border-2 border-dashed border-border bg-bg-light hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-3 overflow-hidden group"
        >
          {draft.coverPreview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.coverPreview} alt="cover" className="absolute inset-0 w-full h-full object-cover rounded-2xl" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                <p className="text-white text-sm font-semibold">Change Cover</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-primary">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-primary">Upload cover image</p>
                <p className="text-xs text-gray-400 mt-0.5">PNG, JPG up to 5MB</p>
              </div>
            </>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={pickCover} className="hidden" />
      </div>

      {/* Title */}
      <div>
        <Label>Story Title *</Label>
        <Input
          value={draft.title}
          onChange={(v) => update({ title: v })}
          placeholder="e.g. The Billionaire's Algorithm"
        />
      </div>

      {/* Niche */}
      <div>
        <Label>Category / Niche *</Label>
        <div className="flex flex-wrap gap-2">
          {NICHES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => update({ niche: n })}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors ${
                draft.niche === n
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-gray-600 border-border hover:border-primary hover:text-primary"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <Label>Tags</Label>
        <div className="flex gap-2 mb-2 flex-wrap">
          {draft.tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
              #{tag}
              <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 hover:text-red-500 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-2.5 h-2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
            placeholder="Type a tag and press Enter"
            className="flex-1 px-4 py-2.5 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Description */}
      <div>
        <Label>Description *</Label>
        <Textarea
          value={draft.description}
          onChange={(v) => update({ description: v })}
          placeholder="Describe your story — what will readers learn or experience? (min 50 characters)"
          rows={5}
        />
        <p className={`text-xs mt-1 text-right ${draft.description.length < 50 ? "text-gray-400" : "text-primary"}`}>
          {draft.description.length} / 50 min
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 2 — Episodes
// ─────────────────────────────────────────────────────────────────

function VideoUploadZone({
  ep,
  onUpdate,
}: {
  ep: EpisodeDraft;
  onUpdate: (patch: Partial<EpisodeDraft>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function pickVideo(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    onUpdate({ videoFile: f, videoName: f.name, uploadPct: 0, uploaded: false, uploading: true });

    // Simulated upload progress
    let pct = 0;
    const tick = setInterval(() => {
      pct += Math.random() * 18 + 4;
      if (pct >= 100) {
        pct = 100;
        clearInterval(tick);
        onUpdate({ uploadPct: 100, uploading: false, uploaded: true });
      } else {
        onUpdate({ uploadPct: Math.round(pct) });
      }
    }, 180);
  }

  if (ep.uploaded) {
    return (
      <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary truncate">{ep.videoName}</p>
          <p className="text-xs text-primary/60">Uploaded successfully</p>
        </div>
        <button
          type="button"
          onClick={() => { onUpdate({ videoFile: null, videoName: "", uploadPct: 0, uploaded: false, uploading: false }); }}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    );
  }

  if (ep.uploading) {
    return (
      <div className="bg-white border border-border rounded-xl px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-600 truncate max-w-[70%]">{ep.videoName}</p>
          <span className="text-xs font-bold text-primary">{ep.uploadPct}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-150"
            style={{ width: `${ep.uploadPct}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">Uploading video…</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      className="w-full border-2 border-dashed border-border rounded-xl py-5 flex flex-col items-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors group"
    >
      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-primary">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-primary">Upload Video</p>
        <p className="text-xs text-gray-400 mt-0.5">MP4, MOV, AVI up to 500MB</p>
      </div>
      <input ref={fileRef} type="file" accept="video/*" onChange={pickVideo} className="hidden" />
    </button>
  );
}

function Step2Episodes({ draft, update }: { draft: Draft; update: (p: Partial<Draft>) => void }) {
  function addEpisode() {
    update({ episodes: [...draft.episodes, blankEpisode(draft.episodes.length + 1)] });
  }

  function removeEpisode(id: string) {
    if (draft.episodes.length === 1) return;
    const remaining = draft.episodes
      .filter((e) => e.id !== id)
      .map((e, i) => ({ ...e, number: i + 1 }));
    update({ episodes: remaining });
  }

  function updateEp(id: string, patch: Partial<EpisodeDraft>) {
    update({ episodes: draft.episodes.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">
        Add one or more episodes. Episode 1 will be the free preview.
      </p>

      {draft.episodes.map((ep) => (
        <div key={ep.id} className="bg-bg-light border border-border rounded-2xl overflow-hidden">
          {/* Episode header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary text-white text-sm font-black flex items-center justify-center flex-shrink-0">
                {ep.number}
              </div>
              <div>
                <p className="text-sm font-bold text-text-dark">
                  Episode {ep.number}
                  {ep.number === 1 && (
                    <span className="ml-2 text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                      FREE PREVIEW
                    </span>
                  )}
                </p>
              </div>
            </div>
            {draft.episodes.length > 1 && (
              <button
                type="button"
                onClick={() => removeEpisode(ep.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
              </button>
            )}
          </div>

          <div className="px-4 pb-4 flex flex-col gap-3">
            {/* Title */}
            <div>
              <Label>Episode Title *</Label>
              <Input
                value={ep.title}
                onChange={(v) => updateEp(ep.id, { title: v })}
                placeholder="e.g. The Spark — Where It All Began"
              />
            </div>

            {/* Description */}
            <div>
              <Label>Episode Description</Label>
              <Textarea
                value={ep.description}
                onChange={(v) => updateEp(ep.id, { description: v })}
                placeholder="Brief description of this episode's content"
                rows={2}
              />
            </div>

            {/* Video upload */}
            <div>
              <Label>Video File</Label>
              <VideoUploadZone ep={ep} onUpdate={(p) => updateEp(ep.id, p)} />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addEpisode}
        className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-primary/30 rounded-2xl text-primary text-sm font-semibold hover:bg-primary/5 hover:border-primary transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Episode
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 3 — Quiz Questions
// ─────────────────────────────────────────────────────────────────

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

function QuestionCard({
  q,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: {
  q: QuizQ;
  index: number;
  onUpdate: (patch: Partial<QuizQ>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="bg-bg-light border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-primary text-white text-xs font-black flex items-center justify-center">
            {index + 1}
          </div>
          <p className="text-sm font-bold text-text-dark">Question {index + 1}</p>
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        )}
      </div>

      <div className="px-4 pb-4 flex flex-col gap-3">
        {/* Question text */}
        <div>
          <Label>Question Text *</Label>
          <Textarea
            value={q.text}
            onChange={(v) => onUpdate({ text: v })}
            placeholder="e.g. What was the author's key insight in Episode 1?"
            rows={2}
          />
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {OPTION_LABELS.map((opt) => (
            <div key={opt}>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                    q.correct === opt ? "bg-primary text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {opt}
                </span>
                Option {opt}
                {q.correct === opt && (
                  <span className="text-primary font-bold text-[9px] uppercase">✓ Correct</span>
                )}
              </label>
              <input
                type="text"
                value={q[opt]}
                onChange={(e) => onUpdate({ [opt]: e.target.value })}
                placeholder={`Option ${opt}`}
                className="w-full px-3 py-2.5 bg-white border border-border rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>
          ))}
        </div>

        {/* Correct answer */}
        <div>
          <Label>Correct Answer *</Label>
          <div className="flex gap-2">
            {OPTION_LABELS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onUpdate({ correct: opt })}
                className={`flex-1 py-2.5 rounded-xl text-sm font-black border-2 transition-colors ${
                  q.correct === opt
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white text-gray-500 border-border hover:border-primary hover:text-primary"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step3Quiz({ draft, update }: { draft: Draft; update: (p: Partial<Draft>) => void }) {
  function addQ() {
    update({ quiz: [...draft.quiz, blankQuestion()] });
  }

  function updateQ(id: string, patch: Partial<QuizQ>) {
    update({ quiz: draft.quiz.map((q) => (q.id === id ? { ...q, ...patch } : q)) });
  }

  function removeQ(id: string) {
    if (draft.quiz.length === 1) return;
    update({ quiz: draft.quiz.filter((q) => q.id !== id) });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">
        Add comprehension questions. Readers answer these after Episode 1. At least one question required.
      </p>

      {draft.quiz.map((q, i) => (
        <QuestionCard
          key={q.id}
          q={q}
          index={i}
          onUpdate={(p) => updateQ(q.id, p)}
          onRemove={() => removeQ(q.id)}
          canRemove={draft.quiz.length > 1}
        />
      ))}

      <button
        type="button"
        onClick={addQ}
        className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-primary/30 rounded-2xl text-primary text-sm font-semibold hover:bg-primary/5 hover:border-primary transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Question
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 4 — Pricing
// ─────────────────────────────────────────────────────────────────

function Step4Pricing({ draft, update }: { draft: Draft; update: (p: Partial<Draft>) => void }) {
  const priceNum = Number(draft.price) || 0;
  const royaltyEarning = ((priceNum * draft.royaltyPct) / 100).toFixed(0);

  return (
    <div className="flex flex-col gap-5">
      {/* Free toggle */}
      <div className="bg-white border border-border rounded-2xl p-4">
        <Toggle
          on={draft.isFree}
          onChange={(v) => update({ isFree: v, price: v ? "0" : draft.price || "1500" })}
          label="Make this story free"
        />
        {draft.isFree && (
          <p className="text-xs text-gray-500 mt-2.5 ml-14">
            Free stories can still earn through the royalty programme.
          </p>
        )}
      </div>

      {/* Price input */}
      {!draft.isFree && (
        <div>
          <Label>Story Price (₦) *</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₦</span>
            <input
              type="number"
              min="100"
              max="50000"
              step="100"
              value={draft.price}
              onChange={(e) => update({ price: e.target.value })}
              placeholder="1500"
              className="w-full pl-8 pr-4 py-3 bg-white border border-border rounded-xl text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Suggested range: ₦500 – ₦10,000</p>
        </div>
      )}

      {/* Royalty toggle */}
      <div className="bg-white border border-border rounded-2xl p-4">
        <Toggle
          on={draft.royaltyEnabled}
          onChange={(v) => update({ royaltyEnabled: v })}
          label="Enable Royalty Programme"
        />
        <p className="text-xs text-gray-500 mt-2.5 ml-14">
          Readers earn a commission when they refer new buyers to your story.
        </p>
      </div>

      {/* Royalty % */}
      {draft.royaltyEnabled && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label>Royalty Percentage</Label>
            <span className="text-lg font-black text-primary">{draft.royaltyPct}%</span>
          </div>

          <input
            type="range"
            min="5"
            max="50"
            step="1"
            value={draft.royaltyPct}
            onChange={(e) => update({ royaltyPct: Number(e.target.value) })}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-gray-100"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>5%</span><span>50%</span>
          </div>

          {/* Earnings preview */}
          {!draft.isFree && priceNum > 0 && (
            <div className="mt-4 bg-gold/10 border border-gold/30 rounded-xl p-4">
              <p className="text-xs font-bold text-text-dark mb-2">Referral Earnings Preview</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[10, 50, 100, 500].map((n) => (
                  <div key={n} className="flex justify-between">
                    <span className="text-gray-600">{n} sales via referral</span>
                    <span className="font-bold text-gold">
                      ₦{(Number(royaltyEarning) * n).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                Each referrer earns ₦{Number(royaltyEarning).toLocaleString()} per sale
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 5 — Review
// ─────────────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border last:border-0">
      <span className="text-xs text-gray-500 flex-shrink-0 w-28">{label}</span>
      <span className="text-xs font-semibold text-text-dark text-right">{value}</span>
    </div>
  );
}

function Step5Review({ draft }: { draft: Draft }) {
  const completedEps = draft.episodes.filter((e) => e.uploaded).length;
  const validQs = draft.quiz.filter((q) => q.text && q.A && q.B && q.C && q.D).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Story preview */}
      <div className="flex gap-4 bg-white border border-border rounded-2xl p-4">
        <div className={`w-16 h-24 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl ${draft.coverPreview ? "" : "bg-primary/10"}`}>
          {draft.coverPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.coverPreview} alt="cover" className="w-16 h-24 rounded-xl object-cover" />
          ) : (
            <span>📖</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-text-dark leading-tight">{draft.title || "Untitled Story"}</p>
          {draft.niche && (
            <span className="inline-block mt-1 text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
              {draft.niche}
            </span>
          )}
          {draft.tags.length > 0 && (
            <p className="text-xs text-gray-400 mt-1 truncate">{draft.tags.map((t) => `#${t}`).join(" ")}</p>
          )}
          <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{draft.description || "No description"}</p>
        </div>
      </div>

      {/* Summary rows */}
      <div className="bg-white border border-border rounded-2xl px-4 py-1">
        <ReviewRow label="Episodes" value={`${draft.episodes.length} total (${completedEps} with video)`} />
        <ReviewRow label="Quiz Questions" value={`${validQs} question${validQs !== 1 ? "s" : ""}`} />
        <ReviewRow label="Price" value={draft.isFree ? "Free" : `₦${Number(draft.price || 0).toLocaleString()}`} />
        <ReviewRow
          label="Royalty"
          value={draft.royaltyEnabled ? `${draft.royaltyPct}% per referral` : "Disabled"}
        />
      </div>

      {/* Notice */}
      <div className="flex gap-3 bg-primary/5 border border-primary/20 rounded-2xl p-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-primary flex-shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-xs text-gray-600 leading-relaxed">
          Your story will go through an auto-approval check. If it passes all requirements, it will be published immediately. Otherwise it will be queued for manual review (usually within 24 hours).
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Result screens
// ─────────────────────────────────────────────────────────────────

function SuccessScreen({ storyId }: { storyId?: string }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center p-6">
      {/* Decorative circles */}
      <div className="absolute top-20 right-20 w-48 h-48 bg-white/5 rounded-full" />
      <div className="absolute bottom-20 left-20 w-32 h-32 bg-white/5 rounded-full" />

      <div className="relative text-center max-w-sm w-full">
        {/* Checkmark */}
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-primary">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="text-3xl font-black text-white mb-2">Published!</h1>
        <p className="text-primary-light text-sm mb-8 leading-relaxed">
          Your story passed the auto-approval check and is now live in the Story Market.
        </p>

        <div className="flex flex-col gap-3">
          {storyId && (
            <Link
              href={`/dashboard/stories/${storyId}`}
              className="w-full py-3.5 bg-gold text-text-dark font-bold rounded-2xl text-sm text-center hover:bg-yellow-400 transition-colors"
            >
              View My Story
            </Link>
          )}
          <Link
            href="/dashboard/stories/create"
            onClick={() => window.location.reload()}
            className="w-full py-3.5 bg-white/15 text-white font-semibold rounded-2xl text-sm text-center hover:bg-white/25 transition-colors"
          >
            Create Another Story
          </Link>
          <Link
            href="/dashboard/stories"
            className="w-full py-3.5 bg-white/10 text-white/80 font-medium rounded-2xl text-sm text-center hover:bg-white/20 transition-colors"
          >
            Go to Story Market
          </Link>
        </div>
      </div>
    </div>
  );
}

function UnderReviewScreen() {
  return (
    <div className="min-h-screen bg-bg-light flex items-center justify-center p-6">
      <div className="text-center max-w-sm w-full">
        {/* Clock icon */}
        <div className="w-24 h-24 bg-white border-4 border-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-11 h-11 text-primary">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h1 className="text-2xl font-black text-text-dark mb-2">Under Review</h1>
        <p className="text-gray-500 text-sm mb-2 leading-relaxed">
          Your story has been submitted and is being reviewed by our team.
        </p>
        <p className="text-gray-400 text-xs mb-8">
          You&apos;ll receive a notification once it&apos;s approved — usually within 24 hours.
        </p>

        <div className="bg-white border border-border rounded-2xl p-4 mb-6 text-left">
          <p className="text-xs font-bold text-text-dark mb-3">What happens next?</p>
          {[
            "Our team reviews your story for quality and guidelines",
            "You receive an email notification with the decision",
            "Approved stories are instantly published in the market",
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-2.5 mb-2 last:mb-0">
              <div className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p className="text-xs text-gray-600">{text}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard/stories/create"
            onClick={() => window.location.reload()}
            className="w-full py-3.5 bg-primary text-white font-bold rounded-2xl text-sm text-center hover:bg-primary-dark transition-colors"
          >
            Create Another Story
          </Link>
          <Link
            href="/dashboard/stories"
            className="w-full py-3.5 bg-white border border-border text-text-dark font-semibold rounded-2xl text-sm text-center hover:border-primary hover:text-primary transition-colors"
          >
            Browse Story Market
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step Indicator
// ─────────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center px-4 py-5">
      {STEPS.map((s, i) => (
        <div key={s.label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                i < current
                  ? "bg-primary text-white"
                  : i === current
                  ? "bg-primary text-white ring-2 ring-primary ring-offset-2"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {i < current ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-[10px] font-semibold whitespace-nowrap hidden sm:block ${
                i <= current ? "text-primary" : "text-gray-400"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-1 mb-4 sm:mb-5 transition-colors ${i < current ? "bg-primary" : "bg-gray-200"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────

function validateStep(step: number, draft: Draft): string | null {
  if (step === 0) {
    if (!draft.title.trim()) return "Story title is required.";
    if (!draft.niche) return "Please select a category.";
    if (draft.description.trim().length < 50) return "Description must be at least 50 characters.";
  }
  if (step === 1) {
    for (const ep of draft.episodes) {
      if (!ep.title.trim()) return `Episode ${ep.number} needs a title.`;
    }
    if (draft.episodes.some((e) => e.uploading)) return "Please wait for all uploads to finish.";
  }
  if (step === 2) {
    for (const q of draft.quiz) {
      if (!q.text.trim()) return "All questions must have text.";
      if (!q.A.trim() || !q.B.trim() || !q.C.trim() || !q.D.trim())
        return "All answer options (A, B, C, D) must be filled.";
    }
  }
  if (step === 3) {
    if (!draft.isFree && (Number(draft.price) < 100)) return "Price must be at least ₦100.";
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────

export default function CreateStoryPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  function update(patch: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
  }

  function next() {
    const err = validateStep(step, draft);
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setError(null);
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    const err = validateStep(step, draft);
    if (err) { setError(err); return; }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/stories/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim(),
          description: draft.description.trim(),
          niche: draft.niche,
          tags: draft.tags,
          coverUrl: null,
          isFree: draft.isFree,
          price: Number(draft.price) || 0,
          royaltyEnabled: draft.royaltyEnabled,
          royaltyPct: draft.royaltyPct,
          episodes: draft.episodes.map((e) => ({
            title: e.title,
            description: e.description,
            number: e.number,
            videoUrl: null,
          })),
          quiz: draft.quiz.map((q) => ({
            text: q.text,
            A: q.A, B: q.B, C: q.C, D: q.D,
            correct: q.correct,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submission failed. Please try again.");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Post-submit result screens ──
  if (result?.approved) return <SuccessScreen storyId={result.storyId} />;
  if (result && !result.approved) return <UnderReviewScreen />;

  const stepComponents = [
    <Step1Details key={0} draft={draft} update={update} />,
    <Step2Episodes key={1} draft={draft} update={update} />,
    <Step3Quiz key={2} draft={draft} update={update} />,
    <Step4Pricing key={3} draft={draft} update={update} />,
    <Step5Review key={4} draft={draft} />,
  ];

  return (
    <div className="min-h-screen bg-bg-light">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-6 pb-2">
          <Link
            href="/dashboard/stories"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Stories
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-text-dark">Create Story</span>
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} />

        {/* Step heading */}
        <div className="px-4 mb-5">
          <h1 className="text-xl font-black text-text-dark">{STEPS[step].label}</h1>
          <p className="text-xs text-gray-400 mt-0.5">Step {step + 1} of {STEPS.length}</p>
        </div>

        {/* Form card */}
        <div className="mx-4 bg-white border border-border rounded-2xl p-5 mb-5">
          {stepComponents[step]}
        </div>

        {/* Error */}
        {error && <div className="mx-4 mb-4"><ErrorBanner msg={error} /></div>}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 px-4 pb-8">
          {step > 0 ? (
            <button
              type="button"
              onClick={back}
              className="flex items-center gap-2 px-6 py-3 border border-border bg-white text-text-dark text-sm font-semibold rounded-xl hover:border-primary hover:text-primary transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>
          ) : (
            <div />
          )}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark transition-colors shadow-sm"
            >
              Continue
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className={`flex items-center gap-2 px-8 py-3 text-white text-sm font-bold rounded-xl transition-colors shadow-sm ${
                submitting ? "bg-primary/60 cursor-not-allowed" : "bg-primary hover:bg-primary-dark"
              }`}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Submitting…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                    <path d="M22 2L11 13" /><path d="M22 2L15 22 11 13 2 9l20-7z" />
                  </svg>
                  Submit Story
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
