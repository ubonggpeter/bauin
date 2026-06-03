"use client";

import { useState, useEffect, useCallback } from "react";

type Campaign = {
  id:             string;
  subject:        string;
  previewText:    string | null;
  bodyText:       string;
  createdBy:      string;
  sentAt:         string | null;
  recipientCount: number;
  createdAt:      string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

export default function CampaignsPage() {
  const [campaigns,    setCampaigns]    = useState<Campaign[]>([]);
  const [subscribers,  setSubscribers]  = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [sending,      setSending]      = useState<string | null>(null);
  const [creating,     setCreating]     = useState(false);
  const [showForm,     setShowForm]     = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [success,      setSuccess]      = useState<string | null>(null);

  // Form state
  const [subject,     setSubject]     = useState("");
  const [previewText, setPreviewText] = useState("");
  const [bodyText,    setBodyText]    = useState("");

  const load = useCallback(async () => {
    try {
      const res  = await fetch("/api/admin/campaigns");
      const data = await res.json() as { campaigns: Campaign[]; subscriberCount: number };
      setCampaigns(data.campaigns);
      setSubscribers(data.subscriberCount);
    } catch { setError("Failed to load campaigns."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true); setError(null); setSuccess(null);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ subject, previewText, bodyText }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setSuccess("Campaign saved as draft.");
      setShowForm(false);
      setSubject(""); setPreviewText(""); setBodyText("");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally { setCreating(false); }
  }

  async function handleSend(id: string) {
    if (!confirm("Send this campaign to all active subscribers now?")) return;
    setSending(id); setError(null); setSuccess(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/send`, { method: "POST" });
      const data = await res.json() as { sent?: number; errors?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSuccess(`Campaign sent to ${data.sent?.toLocaleString() ?? "?"} subscribers.`);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally { setSending(null); }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Campaigns</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {subscribers.toLocaleString()} active subscriber{subscribers !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => { setShowForm((s) => !s); setError(null); }}
          className="bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? "Cancel" : "+ New Campaign"}
        </button>
      </div>

      {error   && <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400">{success}</div>}

      {/* New campaign form */}
      {showForm && (
        <form onSubmit={(e) => void handleCreate(e)} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white">New Campaign</h2>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Subject line *</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Your BAUIN update for this week"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Preview text (shown in inbox)</label>
            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="A short teaser shown below the subject…"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Body *
              <span className="font-normal ml-1 text-gray-400">(separate paragraphs with blank lines)</span>
            </label>
            <textarea
              required
              rows={8}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder={"Write your message here.\n\nUse blank lines to separate paragraphs.\n\nEach paragraph becomes a block of text in the email."}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={creating}
              className="bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              {creating ? "Saving…" : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Campaign list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-7 h-7 border-4 border-teal-600 border-t-transparent rounded-full" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm">
          No campaigns yet. Create your first one above.
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                      {c.subject}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      c.sentAt
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500"
                    }`}>
                      {c.sentAt ? "Sent" : "Draft"}
                    </span>
                  </div>

                  {c.previewText && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{c.previewText}</p>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400 dark:text-gray-500">
                    <span>Created by {c.createdBy} · {formatDate(c.createdAt)}</span>
                    {c.sentAt && (
                      <span>Sent {formatDate(c.sentAt)} · {c.recipientCount.toLocaleString()} recipients</span>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{c.bodyText}</p>
                </div>

                {!c.sentAt && (
                  <button
                    onClick={() => void handleSend(c.id)}
                    disabled={sending === c.id}
                    className="shrink-0 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    {sending === c.id ? "Sending…" : `Send to ${subscribers.toLocaleString()}`}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
