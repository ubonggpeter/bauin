"use client";

import { useEffect, useRef, useState } from "react";

export type FeedbackFeature = "CERTIFICATION" | "WITHDRAWAL" | "QUIZ";

interface Props {
  feature: FeedbackFeature;
  /** Delay in ms before the modal slides in (default 1200) */
  delayMs?: number;
  metadata?: Record<string, unknown>;
  onClose: () => void;
}

// ── Config per feature ────────────────────────────────────────────────────────

const CONFIG = {
  CERTIFICATION: {
    title:    "How was your learning experience?",
    subtitle: "Rate the certification journey from 1 to 5 stars",
    scoreType: "stars" as const,
    placeholder: "Anything to improve? (optional)",
  },
  WITHDRAWAL: {
    title:    "How was the withdrawal experience?",
    subtitle: "Was the process quick and smooth?",
    scoreType: "thumbs" as const,
    placeholder: "Tell us more (optional)",
  },
  QUIZ: {
    title:    "How was this quiz?",
    subtitle: "Rate your experience",
    scoreType: "emoji" as const,
    placeholder: "Any feedback? (optional)",
  },
} as const;

const EMOJI_SCALE: [string, string][] = [
  ["😞", "Poor"],
  ["😐", "Okay"],
  ["🙂", "Good"],
  ["😄", "Great"],
  ["🤩", "Amazing"],
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function FeedbackModal({ feature, delayMs = 1200, metadata, onClose }: Props) {
  const cfg = CONFIG[feature];

  const [visible,    setVisible]    = useState(false);
  const [score,      setScore]      = useState<number | null>(null);
  const [hovered,    setHovered]    = useState<number | null>(null);
  const [comment,    setComment]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timerRef.current);
  }, [delayMs]);

  async function submit() {
    if (score === null) return;
    setSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ feature, score, comment: comment.trim() || null, metadata }),
      });
      setDone(true);
      setTimeout(onClose, 1400);
    } catch {
      setSubmitting(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm mx-0 sm:mx-4 p-6 shadow-2xl"
        style={{ animation: "slideUpSheet 0.3s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {done ? (
          /* ── Thank-you state ── */
          <div className="flex flex-col items-center py-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="#1A6659" strokeWidth={2.5} className="w-7 h-7">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="font-black text-gray-900 text-lg">Thank you!</p>
            <p className="text-gray-400 text-sm mt-1">Your feedback helps us improve.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-5 pr-6">
              <p className="font-black text-gray-900 text-base leading-snug">{cfg.title}</p>
              <p className="text-gray-400 text-sm mt-0.5">{cfg.subtitle}</p>
            </div>

            {/* ── Stars ── */}
            {cfg.scoreType === "stars" && (
              <div className="flex justify-center gap-2 mb-5">
                {[1, 2, 3, 4, 5].map((s) => {
                  const active = (hovered ?? score ?? 0) >= s;
                  return (
                    <button
                      key={s}
                      onClick={() => setScore(s)}
                      onMouseEnter={() => setHovered(s)}
                      onMouseLeave={() => setHovered(null)}
                      className="text-3xl transition-transform active:scale-90"
                      aria-label={`${s} star${s !== 1 ? "s" : ""}`}
                    >
                      <span className={`transition-colors ${active ? "text-gold" : "text-gray-200"}`}>★</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Thumbs ── */}
            {cfg.scoreType === "thumbs" && (
              <div className="flex justify-center gap-6 mb-5">
                {([5, 1] as const).map((val) => {
                  const isUp      = val === 5;
                  const selected  = score === val;
                  return (
                    <button
                      key={val}
                      onClick={() => setScore(val)}
                      className={`flex flex-col items-center gap-1.5 transition-transform active:scale-90 ${selected ? "scale-110" : ""}`}
                    >
                      <span
                        className={`text-5xl transition-all ${selected ? (isUp ? "drop-shadow-[0_0_10px_#22c55e]" : "drop-shadow-[0_0_10px_#ef4444]") : "opacity-40"}`}
                      >
                        {isUp ? "👍" : "👎"}
                      </span>
                      <span className={`text-xs font-semibold ${selected ? (isUp ? "text-green-600" : "text-red-500") : "text-gray-400"}`}>
                        {isUp ? "Smooth" : "Had issues"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Emoji scale ── */}
            {cfg.scoreType === "emoji" && (
              <div className="flex justify-between mb-2 px-1">
                {EMOJI_SCALE.map(([emoji, label], i) => {
                  const val      = i + 1;
                  const selected = score === val;
                  return (
                    <button
                      key={val}
                      onClick={() => setScore(val)}
                      className={`flex flex-col items-center gap-1 transition-transform active:scale-90 ${selected ? "scale-110" : ""}`}
                    >
                      <span className={`text-3xl transition-all ${selected ? "" : "opacity-40 grayscale"}`}>{emoji}</span>
                      <span className={`text-[10px] font-medium ${selected ? "text-primary" : "text-gray-400"}`}>{label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Comment */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder={cfg.placeholder}
              className="w-full mt-4 px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-primary text-gray-700 placeholder:text-gray-300"
            />

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={submit}
                disabled={score === null || submitting}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-colors disabled:opacity-40"
              >
                {submitting ? "Sending…" : "Submit"}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideUpSheet {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
