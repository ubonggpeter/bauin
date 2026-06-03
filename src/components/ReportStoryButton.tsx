"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

const REASONS: { value: string; label: string; icon: string }[] = [
  { value: "ADULT_CONTENT", label: "Adult Content",  icon: "🔞" },
  { value: "SCAM",          label: "Scam / Fraud",   icon: "⚠️" },
  { value: "COPYRIGHT",     label: "Copyright",      icon: "©️" },
  { value: "HATE_SPEECH",   label: "Hate Speech",    icon: "🚫" },
  { value: "OTHER",         label: "Other",           icon: "📋" },
];

type Props = {
  storyId:    string;
  storyTitle: string;
  /** Tailwind or inline styles override for the trigger button */
  className?: string;
};

export default function ReportStoryButton({ storyId, storyTitle, className }: Props) {
  const { data: authSession } = useSession();
  const [open,     setOpen]     = useState(false);
  const [reason,   setReason]   = useState("");
  const [details,  setDetails]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState("");

  function handleOpen(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
    setDone(false);
    setError("");
    setReason("");
    setDetails("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) { setError("Please choose a reason."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/stories/${storyId}/report`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ reason, details }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to submit report");
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Trigger — small flag icon button */}
      <button
        onClick={handleOpen}
        title="Report this story"
        aria-label="Report this story"
        className={className ?? "p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10l-1.5 3L16 9H6a1 1 0 000 2h10.5l1.5 3H6a3 3 0 01-3-3V6z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Modal backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {done ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-semibold text-gray-900 dark:text-white">Report submitted</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Our moderation team will review it shortly.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-semibold px-5 py-2 rounded-full"
                >
                  Close
                </button>
              </div>
            ) : !authSession?.user ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-3">🔒</div>
                <p className="font-semibold text-gray-900 dark:text-white">Sign in to report</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  You need to be logged in to report content.
                </p>
              </div>
            ) : (
              <form onSubmit={(e) => void handleSubmit(e)}>
                <div className="flex items-center gap-2 mb-1">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 flex-shrink-0">
                    <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10l-1.5 3L16 9H6a1 1 0 000 2h10.5l1.5 3H6a3 3 0 01-3-3V6z" clipRule="evenodd" />
                  </svg>
                  <h2 className="font-bold text-gray-900 dark:text-white text-base">Report story</h2>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-1">
                  &ldquo;{storyTitle}&rdquo;
                </p>

                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                  Choose a reason
                </p>
                <div className="grid grid-cols-1 gap-2 mb-4">
                  {REASONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setReason(r.value)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-colors ${
                        reason === r.value
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                          : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <span className="text-base">{r.icon}</span>
                      {r.label}
                    </button>
                  ))}
                </div>

                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Additional details
                  <span className="font-normal text-gray-400 normal-case tracking-normal ml-1">(optional)</span>
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={2}
                  placeholder="Describe the issue briefly…"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-400 mb-3"
                />

                {error && (
                  <p className="text-red-500 text-xs mb-3">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !reason}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
                >
                  {loading ? "Submitting…" : "Submit Report"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
