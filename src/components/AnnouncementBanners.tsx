"use client";
import { useEffect, useState } from "react";

type Announcement = {
  id:        string;
  title:     string;
  body:      string;
  type:      "INFO" | "WARNING" | "PROMOTION";
  expiresAt: string | null;
  createdAt: string;
};

const THEME = {
  INFO:      { bg: "bg-teal-700",  border: "border-teal-500",  text: "text-teal-50",  icon: "📢", label: "INFO"      },
  WARNING:   { bg: "bg-orange-600", border: "border-orange-400", text: "text-orange-50", icon: "⚠️", label: "WARNING"   },
  PROMOTION: { bg: "bg-amber-500",  border: "border-amber-300",  text: "text-amber-950", icon: "🎉", label: "NEW OFFER" },
} as const;

const DISMISSED_KEY = "bauin-dismissed-announcements";

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function addDismissed(id: string) {
  const set = getDismissed();
  set.add(id);
  // Keep only the last 50 to avoid unbounded growth
  const arr = Array.from(set).slice(-50);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr));
}

export default function AnnouncementBanners() {
  const [items, setItems] = useState<Announcement[]>([]);

  useEffect(() => {
    fetch("/api/announcements/active")
      .then((r) => r.json())
      .then((d: { announcements?: Announcement[] }) => {
        const dismissed = getDismissed();
        const visible = (d.announcements ?? []).filter((a) => !dismissed.has(a.id));
        setItems(visible);
      })
      .catch(() => {});
  }, []);

  function dismiss(id: string) {
    addDismissed(id);
    setItems((prev) => prev.filter((a) => a.id !== id));
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 px-4 pt-3">
      {items.map((ann) => {
        const t = THEME[ann.type];
        return (
          <div
            key={ann.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${t.bg} ${t.border} ${t.text} shadow-sm`}
          >
            <span className="text-lg flex-shrink-0 mt-0.5">{t.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold tracking-widest opacity-75">{t.label}</span>
                <span className="font-semibold text-sm">{ann.title}</span>
              </div>
              <p
                className="text-xs opacity-90 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: ann.body }}
              />
            </div>
            <button
              onClick={() => dismiss(ann.id)}
              aria-label="Dismiss"
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity text-lg leading-none mt-0.5"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
