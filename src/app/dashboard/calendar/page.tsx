"use client";

import { useEffect, useState, useCallback } from "react";

interface CalEvent {
  id:                  string;
  name:                string;
  publicLinkCode:      string;
  isInUse:             boolean;
  scheduledActivateAt: string | null; // ISO
  description:         string | null;
}

// ── Calendar helpers ──────────────────────────────────────────────
function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ── Event chip ────────────────────────────────────────────────────
function EventChip({
  event,
  onDragStart,
}: {
  event:        CalEvent;
  onDragStart:  (e: React.DragEvent, id: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, event.id)}
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md cursor-grab active:cursor-grabbing truncate leading-tight transition-opacity hover:opacity-90 ${
        event.isInUse ? "bg-primary text-white" : "bg-gold/20 text-amber-800 border border-gold/30"
      }`}
      title={event.name}
    >
      {event.isInUse ? "● " : "○ "}{event.name}
    </div>
  );
}

// ── Day cell ──────────────────────────────────────────────────────
function DayCell({
  day,
  isToday,
  isOtherMonth,
  events,
  onDragStart,
  onDrop,
  onDragOver,
}: {
  day:          number | null;
  isToday:      boolean;
  isOtherMonth: boolean;
  events:       CalEvent[];
  onDragStart:  (e: React.DragEvent, id: string) => void;
  onDrop:       (day: number) => void;
  onDragOver:   (e: React.DragEvent) => void;
}) {
  const [hover, setHover] = useState(false);

  if (day === null) {
    return <div className="min-h-[90px] border border-border/30 bg-bg-light/30 rounded-xl" />;
  }

  return (
    <div
      className={`min-h-[90px] border rounded-xl p-1.5 flex flex-col gap-1 transition-colors ${
        isOtherMonth ? "border-border/30 bg-bg-light/30" :
        hover ? "border-primary/50 bg-primary/3" :
        isToday ? "border-primary bg-primary/5" :
        "border-border bg-white"
      }`}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={() => { setHover(false); onDrop(day); }}
    >
      <span className={`text-xs font-bold leading-none self-start w-5 h-5 flex items-center justify-center rounded-full ${
        isToday ? "bg-primary text-white" : isOtherMonth ? "text-gray-300" : "text-gray-400"
      }`}>
        {day}
      </span>
      <div className="flex flex-col gap-0.5 overflow-hidden">
        {events.slice(0, 3).map((ev) => (
          <EventChip key={ev.id} event={ev} onDragStart={onDragStart} />
        ))}
        {events.length > 3 && (
          <span className="text-[9px] text-gray-400 pl-1">+{events.length - 3} more</span>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function CalendarPage() {
  const today  = new Date();
  const [year,  setYear]   = useState(today.getFullYear());
  const [month, setMonth]  = useState(today.getMonth());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/collections")
      .then((r) => r.json())
      .then((d: { collections?: CalEvent[] }) => setEvents(d.collections ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  const firstDay  = firstDayOfMonth(year, month);
  const totalDays = daysInMonth(year, month);

  // Build cells: nulls for leading padding + actual days
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  function eventsForDay(day: number | null): CalEvent[] {
    if (day === null) return [];
    return events.filter((ev) => {
      if (!ev.scheduledActivateAt) return false;
      const d = new Date(ev.scheduledActivateAt);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  function isToday(day: number | null) {
    if (!day) return false;
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  }

  const onDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDragging(id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(async (day: number) => {
    if (!dragging) return;
    const ev = events.find((e) => e.id === dragging);
    if (!ev) { setDragging(null); return; }

    // Preserve existing time, just change the date
    const existing = ev.scheduledActivateAt ? new Date(ev.scheduledActivateAt) : new Date();
    const newDt = new Date(
      year,
      month,
      day,
      existing.getHours(),
      existing.getMinutes(),
    );

    setDragging(null);
    setSaving(dragging);

    // Optimistic update
    setEvents((prev) =>
      prev.map((e) =>
        e.id === dragging ? { ...e, scheduledActivateAt: newDt.toISOString() } : e,
      ),
    );

    try {
      await fetch(`/api/collections/${dragging}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ scheduledActivateAt: newDt.toISOString() }),
      });
    } catch {
      // silently revert on error
    } finally {
      setSaving(null);
    }
  }, [dragging, events, year, month]);

  // Unscheduled events sidebar
  const unscheduled = events.filter((ev) => !ev.scheduledActivateAt);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Content Calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Drag collection cards to reschedule</p>
        </div>
        {saving && (
          <span className="text-xs text-primary font-semibold animate-pulse">Saving…</span>
        )}
      </div>

      <div className="flex gap-6">
        {/* Calendar grid */}
        <div className="flex-1 min-w-0">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth}
              className="w-9 h-9 rounded-xl bg-white border border-border flex items-center justify-center hover:bg-bg-light transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-text-dark">
              {MONTHS[month]} {year}
            </h2>
            <button onClick={nextMonth}
              className="w-9 h-9 rounded-xl bg-white border border-border flex items-center justify-center hover:bg-bg-light transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          {loading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array(35).fill(0).map((_, i) => (
                <div key={i} className="min-h-[90px] bg-white border border-border rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => (
                <DayCell
                  key={idx}
                  day={day}
                  isToday={isToday(day)}
                  isOtherMonth={day === null}
                  events={eventsForDay(day)}
                  onDragStart={onDragStart}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                />
              ))}
            </div>
          )}
        </div>

        {/* Unscheduled sidebar */}
        <div className="w-52 shrink-0 hidden lg:block">
          <div className="bg-white border border-border rounded-2xl p-4 sticky top-6">
            <h3 className="text-sm font-bold text-text-dark mb-1">Unscheduled</h3>
            <p className="text-xs text-gray-400 mb-3">Drag to place on calendar</p>
            <div className="space-y-2">
              {unscheduled.length === 0 ? (
                <p className="text-xs text-gray-300 text-center py-4">All collections scheduled</p>
              ) : (
                unscheduled.map((ev) => (
                  <div
                    key={ev.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, ev.id)}
                    className={`px-3 py-2.5 rounded-xl border cursor-grab active:cursor-grabbing text-sm font-semibold text-text-dark truncate transition-colors hover:border-primary/40 ${
                      ev.isInUse ? "border-primary/30 bg-primary/5" : "border-border bg-bg-light"
                    }`}
                    title={ev.name}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ev.isInUse ? "bg-green-500" : "bg-gray-300"}`} />
                      <span className="truncate text-xs">{ev.name}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-normal font-mono truncate">
                      {ev.publicLinkCode}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-primary" />Active
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gold/20 border border-gold/30" />Scheduled
        </span>
        <span className="text-gray-300">· Drag cards to reschedule</span>
      </div>
    </div>
  );
}
