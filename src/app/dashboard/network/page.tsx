"use client";
import { useEffect, useState, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────
type Collection = {
  id:                  string;
  name:                string;
  description:         string | null;
  publicLinkCode:      string;
  customAlias:         string | null;
  isInUse:             boolean;
  scheduledActivateAt: string | null;
  maxParticipants:     number | null;
  ctaText:             string | null;
  accentColor:         string | null;
  logoUrl:             string | null;
  welcomeMessage:      string | null;
  createdAt:           string;
  sessionCount:        number;
  players:             number;
  earnings:            number;
  royaltyOwed:         number;
};

// ── Mock data (shown while API loads or in demo) ──────────────────
const MOCK: Collection[] = [
  {
    id: "1", name: "Story: The Hustle",
    description: "Referral link for story: The Hustle | storyId:abc123",
    publicLinkCode: "Z4T8XQRP2", customAlias: null,
    isInUse: true, scheduledActivateAt: null,
    maxParticipants: null, createdAt: "2024-11-01T10:00:00Z",
    ctaText: null, accentColor: null, logoUrl: null, welcomeMessage: null,
    sessionCount: 5, players: 48, earnings: 12400, royaltyOwed: 1860,
  },
  {
    id: "2", name: "Story: Digital Empire",
    description: "Referral link for story: Digital Empire | storyId:def456",
    publicLinkCode: "A7K2MNVB1", customAlias: "digital-empire",
    isInUse: false, scheduledActivateAt: "2025-01-15T09:00:00Z",
    maxParticipants: 100, createdAt: "2024-11-10T08:30:00Z",
    ctaText: null, accentColor: "#7C3AED", logoUrl: null, welcomeMessage: null,
    sessionCount: 2, players: 19, earnings: 5200, royaltyOwed: 780,
  },
  {
    id: "3", name: "Story: Blockchain Wealth",
    description: "Referral link for story: Blockchain Wealth | storyId:ghi789",
    publicLinkCode: "C9R5YTVD3", customAlias: null,
    isInUse: true, scheduledActivateAt: null,
    maxParticipants: null, createdAt: "2024-11-18T14:00:00Z",
    ctaText: null, accentColor: null, logoUrl: null, welcomeMessage: null,
    sessionCount: 8, players: 73, earnings: 22100, royaltyOwed: 3315,
  },
  {
    id: "4", name: "Story: Morning Millionaire",
    description: "Referral link for story: Morning Millionaire | storyId:jkl012",
    publicLinkCode: "F2W0EPLQ8", customAlias: null,
    isInUse: false, scheduledActivateAt: null,
    maxParticipants: null, createdAt: "2024-12-01T11:00:00Z",
    ctaText: null, accentColor: null, logoUrl: null, welcomeMessage: null,
    sessionCount: 0, players: 0, earnings: 0, royaltyOwed: 0,
  },
];

// ── Schedule Modal ─────────────────────────────────────────────────
function ScheduleModal({
  collection,
  onClose,
  onSave,
}: {
  collection: Collection;
  onClose: () => void;
  onSave: (dt: string | null) => Promise<void>;
}) {
  const defaultVal = collection.scheduledActivateAt
    ? collection.scheduledActivateAt.slice(0, 16)
    : "";
  const [value, setValue] = useState(defaultVal);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(value || null);
    setSaving(false);
    onClose();
  }

  async function handleClear() {
    setSaving(true);
    await onSave(null);
    setSaving(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-text-dark text-lg leading-snug">
              Schedule Collection
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 font-mono truncate">{collection.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <label className="block text-sm font-medium text-text-dark mb-2">
          Activate on
        </label>
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-dark bg-bg-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
        {collection.scheduledActivateAt && (
          <p className="text-xs text-gray-400 mt-2">
            Currently scheduled:{" "}
            <span className="text-gold font-medium">
              {new Date(collection.scheduledActivateAt).toLocaleString()}
            </span>
          </p>
        )}

        <div className="flex gap-3 mt-5">
          {collection.scheduledActivateAt && (
            <button
              onClick={handleClear}
              disabled={saving}
              className="flex-1 py-3 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Clear
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !value}
            className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Set Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Customise Modal ────────────────────────────────────────────────
function CustomiseModal({
  collection,
  onClose,
  onSave,
}: {
  collection: Collection;
  onClose:    () => void;
  onSave:     (data: Partial<Collection>) => Promise<void>;
}) {
  const [alias,   setAlias]   = useState(collection.customAlias ?? "");
  const [cta,     setCta]     = useState(collection.ctaText     ?? "");
  const [color,   setColor]   = useState(collection.accentColor ?? "#1A6659");
  const [logo,    setLogo]    = useState(collection.logoUrl     ?? "");
  const [welcome, setWelcome] = useState(collection.welcomeMessage ?? "");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  async function handleSave() {
    setError("");
    if (alias && !/^[a-z0-9-]{3,30}$/.test(alias)) {
      setError("Alias: 3–30 lowercase letters, numbers, or hyphens only");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        customAlias:    alias    || null,
        ctaText:        cta      || null,
        accentColor:    color    || null,
        logoUrl:        logo     || null,
        welcomeMessage: welcome  || null,
      });
      onClose();
    } catch {
      setError("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const aliasUrl = alias ? `https://bauin.com/play/${alias}` : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-text-dark text-lg">Customise Quiz Page</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{collection.name}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        <div className="space-y-4">
          {/* Custom alias */}
          <div>
            <label className="block text-sm font-semibold text-text-dark mb-1.5">
              Custom Alias
              <span className="text-gray-400 font-normal ml-1">— bauin.com/play/<em>alias</em></span>
            </label>
            <input
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="e.g. hustle-quiz"
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            {aliasUrl && (
              <p className="text-xs text-green-600 mt-1 font-mono">{aliasUrl}</p>
            )}
          </div>

          {/* Accent colour */}
          <div>
            <label className="block text-sm font-semibold text-text-dark mb-1.5">Accent Colour</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-12 rounded-xl border border-border cursor-pointer bg-white p-1"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#1A6659"
                className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: color }} />
            </div>
          </div>

          {/* CTA text */}
          <div>
            <label className="block text-sm font-semibold text-text-dark mb-1.5">
              CTA Button Text
              <span className="text-gray-400 font-normal ml-1">— default: Play Now</span>
            </label>
            <input
              type="text"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="Play Now"
              maxLength={40}
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-sm font-semibold text-text-dark mb-1.5">Logo URL</label>
            <input
              type="url"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://…/logo.png"
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            {logo && (
              <img src={logo} alt="logo preview" className="h-8 mt-2 object-contain rounded" onError={(e) => (e.currentTarget.style.display = "none")} />
            )}
          </div>

          {/* Welcome message */}
          <div>
            <label className="block text-sm font-semibold text-text-dark mb-1.5">Welcome Message</label>
            <textarea
              value={welcome}
              onChange={(e) => setWelcome(e.target.value)}
              rows={3}
              placeholder="Welcome! Join this quiz to win big prizes…"
              maxLength={280}
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-0.5">{welcome.length}/280</p>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-gray-600 hover:bg-bg-light transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stat block ─────────────────────────────────────────────────────
function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <span className="text-gray-400">{icon}</span>
      <span className="text-base font-bold text-text-dark leading-none">{value}</span>
      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide whitespace-nowrap">{label}</span>
    </div>
  );
}

// ── Collection Card ────────────────────────────────────────────────
function CollectionCard({
  collection,
  onToggle,
  onSchedule,
  onCustomise,
}: {
  collection:  Collection;
  onToggle:    (id: string, next: boolean) => Promise<void>;
  onSchedule:  (c: Collection) => void;
  onCustomise: (c: Collection) => void;
}) {
  const [active, setActive]   = useState(collection.isInUse);
  const [copying, setCopying] = useState(false);
  const [toggling, setToggling] = useState(false);

  const publicUrl = collection.customAlias
    ? `https://bauin.com/play/${collection.customAlias}`
    : `https://bauin.app/ref/${collection.publicLinkCode}`;

  async function handleToggle() {
    setToggling(true);
    const next = !active;
    setActive(next);
    await onToggle(collection.id, next);
    setToggling(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(publicUrl);
    setCopying(true);
    setTimeout(() => setCopying(false), 1800);
  }

  const hasSchedule = !!collection.scheduledActivateAt;
  const scheduleLabel = hasSchedule
    ? new Date(collection.scheduledActivateAt!).toLocaleDateString(undefined, {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <div
      className={`bg-white rounded-xl shadow-sm flex flex-col gap-0 overflow-hidden transition-all duration-200 ${
        active
          ? "border-2 border-gold shadow-gold/20 shadow-md"
          : "border border-border"
      }`}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          {active && (
            <span className="relative flex-shrink-0">
              <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
              <span className="relative w-2.5 h-2.5 rounded-full bg-green-500 block" />
            </span>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-text-dark text-sm leading-snug truncate">
              {collection.name}
            </p>
            {collection.description && (
              <p className="text-[11px] text-gray-400 truncate mt-0.5">
                {collection.description}
              </p>
            )}
          </div>
        </div>

        {/* In Use toggle */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          title={active ? "Disable collection" : "Enable collection"}
          className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gold/50 ${
            active ? "bg-gold" : "bg-gray-200"
          } ${toggling ? "opacity-60" : ""}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
              active ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* ── In Use badge ── */}
      {active && (
        <div className="mx-4 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gold/10 text-gold text-[11px] font-semibold rounded-full border border-gold/30">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            In Use
          </span>
        </div>
      )}

      {/* ── Divider ── */}
      <div className="mx-4 border-t border-border" />

      {/* ── Public link ── */}
      <div className="px-4 py-3">
        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1.5">
          Public Link
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 bg-bg-light rounded-lg px-3 py-2 border border-border/60">
            <p className="text-[11px] text-gray-500 font-mono truncate">{publicUrl}</p>
          </div>
          <button
            onClick={handleCopy}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              copying
                ? "bg-green-100 text-green-600 border border-green-200"
                : "bg-primary text-white hover:bg-primary-dark"
            }`}
          >
            {copying ? (
              <span className="flex items-center gap-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-4 border-t border-border" />

      {/* ── Stats ── */}
      <div className="px-4 py-3 flex items-center gap-2">
        <Stat
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          }
          label="Players"
          value={collection.players.toLocaleString()}
        />
        <div className="w-px h-8 bg-border" />
        <Stat
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
          label="Earnings"
          value={`₦${collection.earnings.toLocaleString()}`}
        />
        <div className="w-px h-8 bg-border" />
        <Stat
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-gold">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          }
          label="Royalty Owed"
          value={`₦${collection.royaltyOwed.toLocaleString()}`}
        />
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-3">
        {scheduleLabel ? (
          <span className="flex items-center gap-1.5 text-[11px] text-gold font-medium">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {scheduleLabel}
          </span>
        ) : (
          <span className="text-[11px] text-gray-400">No schedule set</span>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSchedule(collection)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-text-dark hover:bg-bg-light hover:border-primary/40 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Schedule
          </button>
          <button
            onClick={() => onCustomise(collection)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-primary hover:bg-primary/5 hover:border-primary/40 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            Customise
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-primary">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <div className="text-center">
        <p className="font-semibold text-text-dark">No collections yet</p>
        <p className="text-sm text-gray-500 mt-1">Purchase a story to get your first referral collection</p>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function CollectionsPage() {
  const [collections,  setCollections]  = useState<Collection[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [royaltyPct,   setRoyaltyPct]   = useState(15);
  const [scheduling,   setScheduling]   = useState<Collection | null>(null);
  const [customising,  setCustomising]  = useState<Collection | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    fetch("/api/collections")
      .then((r) => r.json())
      .then((data) => {
        if (data.collections?.length) {
          setCollections(data.collections);
          setRoyaltyPct(data.royaltyPct ?? 15);
        } else {
          setCollections(MOCK);
        }
      })
      .catch(() => setCollections(MOCK))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(id: string, next: boolean) {
    setCollections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isInUse: next } : c))
    );
    await fetch(`/api/collections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isInUse: next }),
    });
  }

  async function handleScheduleSave(dt: string | null) {
    if (!scheduling) return;
    const id = scheduling.id;
    setCollections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, scheduledActivateAt: dt } : c))
    );
    await fetch(`/api/collections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledActivateAt: dt }),
    });
  }

  async function handleCustomiseSave(data: Partial<Collection>) {
    if (!customising) return;
    const id = customising.id;
    const res = await fetch(`/api/collections/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error ?? "Save failed");
    }
    setCollections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    );
  }

  const activeCount = collections.filter((c) => c.isInUse).length;
  const totalEarnings = collections.reduce((s, c) => s + c.earnings, 0);

  return (
    <div className="min-h-screen bg-bg-light">
      {/* ── Top bar ── */}
      <div className="bg-white border-b border-border px-6 py-5 flex items-center justify-between gap-4 sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-bold text-text-dark">My Collections</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your referral collections and track earnings
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Summary pills */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-xs font-semibold text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {activeCount} Active
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 border border-gold/30 rounded-full text-xs font-semibold text-amber-700">
              ₦{totalEarnings.toLocaleString()} earned
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full">
            <span className="text-xs font-bold text-primary">{collections.length}</span>
            <span className="text-xs text-primary/70">collections</span>
          </div>
        </div>
      </div>

      {/* ── Summary bar (mobile) ── */}
      <div className="sm:hidden flex gap-3 px-4 pt-4">
        <div className="flex-1 bg-white rounded-xl border border-border p-3 text-center">
          <p className="text-lg font-bold text-green-600">{activeCount}</p>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Active</p>
        </div>
        <div className="flex-1 bg-white rounded-xl border border-border p-3 text-center">
          <p className="text-lg font-bold text-gold">₦{(totalEarnings / 1000).toFixed(1)}k</p>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Earned</p>
        </div>
        <div className="flex-1 bg-white rounded-xl border border-border p-3 text-center">
          <p className="text-lg font-bold text-primary">{royaltyPct}%</p>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Royalty</p>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="px-4 sm:px-6 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-border h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {collections.length === 0 ? (
              <EmptyState />
            ) : (
              collections.map((c) => (
                <CollectionCard
                  key={c.id}
                  collection={c}
                  onToggle={handleToggle}
                  onSchedule={setScheduling}
                  onCustomise={setCustomising}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Schedule modal ── */}
      {scheduling && (
        <ScheduleModal
          collection={scheduling}
          onClose={() => setScheduling(null)}
          onSave={handleScheduleSave}
        />
      )}

      {/* ── Customise modal ── */}
      {customising && (
        <CustomiseModal
          collection={customising}
          onClose={() => setCustomising(null)}
          onSave={handleCustomiseSave}
        />
      )}
    </div>
  );
}
