"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type AnnType   = "INFO" | "WARNING" | "PROMOTION";
type AnnTarget = "ALL" | "WORKERS" | "SELLERS" | "DISTRIBUTORS" | "VIEWERS";

type Announcement = {
  id:          string;
  title:       string;
  body:        string;
  type:        AnnType;
  target:      AnnTarget;
  expiresAt:   string | null;
  sentAt:      string | null;
  createdAt:   string;
};

// ── Preview banner colours ────────────────────────────────────────────────────

const THEME: Record<AnnType, { bg: string; border: string; text: string; icon: string; label: string }> = {
  INFO:      { bg: "bg-teal-700",   border: "border-teal-500",   text: "text-teal-50",   icon: "📢", label: "INFO"      },
  WARNING:   { bg: "bg-orange-600", border: "border-orange-400", text: "text-orange-50", icon: "⚠️", label: "WARNING"   },
  PROMOTION: { bg: "bg-amber-500",  border: "border-amber-300",  text: "text-amber-950", icon: "🎉", label: "NEW OFFER" },
};

// ── Rich-text toolbar ─────────────────────────────────────────────────────────

const TOOLBAR: { label: string; open: string; close: string }[] = [
  { label: "B",  open: "<strong>",  close: "</strong>"  },
  { label: "I",  open: "<em>",      close: "</em>"      },
  { label: "U",  open: "<u>",       close: "</u>"       },
  { label: "H2", open: "<h2>",      close: "</h2>"      },
  { label: "•",  open: "<ul><li>",  close: "</li></ul>" },
];

function RichTextarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrap(open: string, close: string) {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const selected = value.slice(s, e);
    const next = value.slice(0, s) + open + selected + close + value.slice(e);
    onChange(next);
    // Restore cursor after re-render
    requestAnimationFrame(() => {
      ta.selectionStart = s + open.length;
      ta.selectionEnd   = s + open.length + selected.length;
      ta.focus();
    });
  }

  return (
    <div className="border border-gray-600 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex gap-1 px-2 py-1.5 bg-gray-900 border-b border-gray-700">
        {TOOLBAR.map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={() => wrap(btn.open, btn.close)}
            className="px-2.5 py-1 text-xs font-bold text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            {btn.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-gray-500 self-center">HTML supported</span>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder="Write your announcement body here…"
        className="w-full bg-gray-800 px-3 py-2 text-sm text-white resize-none focus:outline-none font-mono"
      />
    </div>
  );
}

// ── Preview pane ──────────────────────────────────────────────────────────────

function PreviewBanner({ title, body, type }: { title: string; body: string; type: AnnType }) {
  const t = THEME[type];
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${t.bg} ${t.border} ${t.text}`}>
      <span className="text-lg flex-shrink-0 mt-0.5">{t.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-bold tracking-widest opacity-75">{t.label}</span>
          <span className="font-semibold text-sm">{title || "Announcement title"}</span>
        </div>
        {body ? (
          <p
            className="text-xs opacity-90 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        ) : (
          <p className="text-xs opacity-50 italic">Body preview…</p>
        )}
      </div>
      <span className="flex-shrink-0 opacity-40 text-lg leading-none">×</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TARGETS: { value: AnnTarget; label: string }[] = [
  { value: "ALL",          label: "All Users"     },
  { value: "WORKERS",      label: "Workers only"  },
  { value: "SELLERS",      label: "Sellers only"  },
  { value: "DISTRIBUTORS", label: "Distributors"  },
  { value: "VIEWERS",      label: "Viewers only"  },
];

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminAnnouncementsPage() {
  // Form state
  const [title,     setTitle]     = useState("");
  const [body,      setBody]      = useState("");
  const [type,      setType]      = useState<AnnType>("INFO");
  const [target,    setTarget]    = useState<AnnTarget>("ALL");
  const [expiresAt, setExpiresAt] = useState("");
  const [preview,   setPreview]   = useState(false);

  // List state
  const [list,    setList]    = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements");
      const d   = await res.json();
      setList(d.announcements ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function send() {
    setError(null);
    setSuccess(null);
    if (!title.trim()) { setError("Title is required"); return; }
    if (!body.trim())  { setError("Body is required");  return; }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          title:     title.trim(),
          body,
          type,
          target,
          expiresAt: expiresAt || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to send");
        return;
      }
      setTitle("");
      setBody("");
      setType("INFO");
      setTarget("ALL");
      setExpiresAt("");
      setPreview(false);
      setSuccess("Announcement sent — email and push dispatched in the background.");
      void load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteAnn(id: string) {
    if (!confirm("Delete this announcement?")) return;
    await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    void load();
  }

  const isExpired = (ann: Announcement) =>
    ann.expiresAt !== null && new Date(ann.expiresAt) < new Date();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Announcements</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Builder ── */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-base font-semibold text-white mb-4">New Announcement</h2>

          {error   && <p className="mb-3 text-red-400 text-sm">{error}</p>}
          {success && <p className="mb-3 text-green-400 text-sm">{success}</p>}

          {/* Type selector */}
          <div className="flex gap-2 mb-4">
            {(["INFO", "WARNING", "PROMOTION"] as AnnType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                  type === t
                    ? t === "INFO"      ? "bg-teal-700 border-teal-500 text-white"
                    : t === "WARNING"   ? "bg-orange-600 border-orange-400 text-white"
                    :                    "bg-amber-500 border-amber-300 text-amber-950"
                    : "border-gray-600 text-gray-400 hover:text-white"
                }`}
              >
                {THEME[t].icon} {t}
              </button>
            ))}
          </div>

          {/* Title */}
          <label className="block text-sm text-gray-300 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement headline"
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-white mb-4"
          />

          {/* Body — rich text */}
          <label className="block text-sm text-gray-300 mb-1">Body</label>
          <div className="mb-4">
            <RichTextarea value={body} onChange={setBody} />
          </div>

          {/* Target */}
          <label className="block text-sm text-gray-300 mb-1">Target audience</label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as AnnTarget)}
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-white mb-4"
          >
            {TARGETS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {/* Expiry */}
          <label className="block text-sm text-gray-300 mb-1">Expires at (optional)</label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-white mb-5"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className="px-4 py-2 text-sm border border-gray-600 text-gray-300 hover:text-white rounded-md"
            >
              {preview ? "Hide Preview" : "Preview"}
            </button>
            <button
              disabled={saving}
              onClick={() => void send()}
              className="px-5 py-2 text-sm bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white rounded-md font-semibold"
            >
              {saving ? "Sending…" : "Send Announcement"}
            </button>
          </div>
        </div>

        {/* ── Preview pane ── */}
        <div className="flex flex-col gap-4">
          {preview && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Banner preview</p>
              <PreviewBanner title={title} body={body} type={type} />
              <p className="text-xs text-gray-500 mt-2">
                Target: <strong className="text-gray-300">{TARGETS.find((t) => t.value === target)?.label}</strong>
                {expiresAt && (
                  <> · Expires: <strong className="text-gray-300">{new Date(expiresAt).toLocaleString("en-NG")}</strong></>
                )}
              </p>
            </div>
          )}

          {/* Sent announcements */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Sent ({list.length})</p>
            {loading ? (
              <p className="text-gray-500 text-sm">Loading…</p>
            ) : list.length === 0 ? (
              <p className="text-gray-500 text-sm">No announcements yet.</p>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {list.map((ann) => {
                  const t = THEME[ann.type];
                  const expired = isExpired(ann);
                  return (
                    <div
                      key={ann.id}
                      className={`rounded-lg p-3 border text-sm ${
                        expired ? "border-gray-700 bg-gray-900 opacity-50" : `${t.bg} ${t.border}`
                      }`}
                    >
                      <div className={`flex justify-between items-start gap-2 ${expired ? "text-gray-400" : t.text}`}>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold">{t.icon} {ann.title}</span>
                          <div className="flex gap-2 text-[10px] opacity-70 mt-0.5">
                            <span>{ann.target}</span>
                            <span>·</span>
                            <span>{fmtDate(ann.createdAt)}</span>
                            {expired && <span>· EXPIRED</span>}
                            {ann.sentAt && <span>· sent</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => void deleteAnn(ann.id)}
                          className="flex-shrink-0 opacity-60 hover:opacity-100 text-lg leading-none"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
