"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = "FEATURE" | "IMPROVEMENT" | "BUGFIX" | "SECURITY" | "BREAKING";

interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  category: Category;
  title: string;
  description: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LS_KEY = "bauin_changelog_seen";

const CAT_LABEL: Record<Category, string> = {
  FEATURE:     "Feature",
  IMPROVEMENT: "Improvement",
  BUGFIX:      "Bug Fix",
  SECURITY:    "Security",
  BREAKING:    "Breaking",
};

const CAT_STYLE: Record<Category, string> = {
  FEATURE:     "bg-teal-100 text-teal-800 border-teal-200",
  IMPROVEMENT: "bg-blue-100 text-blue-800 border-blue-200",
  BUGFIX:      "bg-amber-100 text-amber-800 border-amber-200",
  SECURITY:    "bg-purple-100 text-purple-800 border-purple-200",
  BREAKING:    "bg-red-100 text-red-800 border-red-200",
};

// ── Modal ─────────────────────────────────────────────────────────────────────

function WhatsNewModal({
  entries,
  onClose,
}: {
  entries: ChangelogEntry[];
  onClose: () => void;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "slideUpModal 0.25s ease" }}
      >
        {/* Teal header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 pt-6 pb-5 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">✨</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-teal-200">What&apos;s New</span>
          </div>
          <h2 className="text-xl font-black leading-tight">Latest Updates</h2>
          <p className="text-teal-200 text-sm mt-1">Here&apos;s what we&apos;ve shipped recently</p>
        </div>

        {/* Entry list */}
        <div className="divide-y divide-gray-100 max-h-[55vh] overflow-y-auto">
          {entries.map((entry) => (
            <div key={entry.id} className="px-6 py-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-black text-teal-700 text-xs bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                  {entry.version}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${CAT_STYLE[entry.category]}`}>
                  {CAT_LABEL[entry.category]}
                </span>
                <span className="text-[11px] text-gray-400 ml-auto">
                  {new Date(entry.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
              <p className="font-semibold text-gray-900 text-sm mb-1">{entry.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{entry.description}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <Link
            href="/changelog"
            className="text-sm font-medium text-teal-700 hover:text-teal-800 hover:underline"
            onClick={onClose}
          >
            View full changelog →
          </Link>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUpModal {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Banner ─────────────────────────────────────────────────────────────────────

export default function WhatsNewBanner() {
  const [entries,     setEntries]     = useState<ChangelogEntry[]>([]);
  const [showBanner,  setShowBanner]  = useState(false);
  const [showModal,   setShowModal]   = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/changelog?limit=3");
        if (!res.ok) return;
        const data = await res.json();
        const latest: ChangelogEntry[] = data.entries ?? [];
        if (!latest.length || cancelled) return;

        const seenAt  = localStorage.getItem(LS_KEY);
        const newestDate = new Date(latest[0].date).getTime();
        const hasNew  = !seenAt || newestDate > new Date(seenAt).getTime();

        if (hasNew) {
          setEntries(latest);
          setShowBanner(true);
        }
      } catch { /* non-critical */ }
    }

    void check();
    return () => { cancelled = true; };
  }, []);

  function openModal() {
    setShowModal(true);
    setShowBanner(false);
  }

  function dismiss() {
    setShowBanner(false);
    localStorage.setItem(LS_KEY, new Date().toISOString());
  }

  function closeModal() {
    setShowModal(false);
    localStorage.setItem(LS_KEY, new Date().toISOString());
  }

  if (!showBanner && !showModal) return null;

  return (
    <>
      {/* Teal banner strip */}
      {showBanner && (
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-4 py-2.5 flex items-center gap-3">
          <span className="text-base flex-shrink-0">✨</span>
          <p className="text-sm font-medium flex-1 min-w-0">
            <span className="font-bold">What&apos;s New</span>
            {entries[0] && (
              <span className="hidden sm:inline text-teal-200 font-normal"> — {entries[0].title}</span>
            )}
          </p>
          <button
            onClick={openModal}
            className="flex-shrink-0 px-3 py-1 text-xs font-semibold bg-white/20 hover:bg-white/30 rounded-full transition-colors whitespace-nowrap"
          >
            See updates
          </button>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && <WhatsNewModal entries={entries} onClose={closeModal} />}
    </>
  );
}
