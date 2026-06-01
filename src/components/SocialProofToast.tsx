"use client";
import { useEffect, useRef, useState } from "react";
import type { RecentEarning } from "@/app/api/social-proof/recent-earnings/route";

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s <  60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(0)}k`;
  return `₦${n.toLocaleString("en-NG")}`;
}

export default function SocialProofToast() {
  const [events, setEvents]   = useState<RecentEarning[]>([]);
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<RecentEarning | null>(null);
  const idxRef   = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch once
  useEffect(() => {
    fetch("/api/social-proof/recent-earnings")
      .then((r) => r.json())
      .then((d: { events?: RecentEarning[] }) => setEvents(d.events ?? []))
      .catch(() => {});
  }, []);

  // Cycle: show for 7s, hide, wait until 30s total, repeat
  useEffect(() => {
    if (events.length === 0) return;

    function show() {
      const ev = events[idxRef.current % events.length];
      idxRef.current += 1;
      setCurrent(ev);
      setVisible(true);

      // Auto-dismiss after 7 s
      timerRef.current = setTimeout(() => {
        setVisible(false);
        // Next cycle in 30 s from when it appeared (30 - 7 = 23 s after dismissal)
        timerRef.current = setTimeout(show, 23_000);
      }, 7_000);
    }

    // First show after 5 s
    timerRef.current = setTimeout(show, 5_000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [events]);

  if (!current) return null;

  return (
    <div
      aria-live="polite"
      className={`
        fixed bottom-5 left-5 z-50 max-w-[300px] w-full
        transition-all duration-500 ease-out
        ${visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0 pointer-events-none"}
      `}
    >
      <div className="flex items-start gap-3 bg-white border border-gray-100 rounded-2xl shadow-xl px-4 py-3">
        {/* Coloured dot */}
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-base mt-0.5">
          {current.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-snug">
            <span className="text-primary">{current.name}</span>
            {" just earned "}
            <span className="text-green-600 font-black">{fmt(current.amount)}</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            from {current.label} · {timeAgo(current.createdAt)}
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="text-gray-300 hover:text-gray-500 text-lg leading-none flex-shrink-0 mt-0.5"
        >
          ×
        </button>
      </div>
    </div>
  );
}
