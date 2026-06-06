"use client";

import { useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = "FEATURE" | "IMPROVEMENT" | "BUGFIX" | "SECURITY" | "BREAKING";

interface Entry {
  id: string;
  version: string;
  date: string;
  category: Category;
  title: string;
  description: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "FEATURE",     label: "Feature" },
  { value: "IMPROVEMENT", label: "Improvement" },
  { value: "BUGFIX",      label: "Bug Fix" },
  { value: "SECURITY",    label: "Security" },
  { value: "BREAKING",    label: "Breaking" },
];

const CAT_STYLE: Record<Category, string> = {
  FEATURE:     "bg-teal-100 text-teal-800",
  IMPROVEMENT: "bg-blue-100 text-blue-800",
  BUGFIX:      "bg-amber-100 text-amber-800",
  SECURITY:    "bg-purple-100 text-purple-800",
  BREAKING:    "bg-red-100 text-red-800",
};

// ── Empty form ─────────────────────────────────────────────────────────────────

const EMPTY = {
  version: "", date: new Date().toISOString().slice(0, 10),
  category: "FEATURE" as Category, title: "", description: "",
};

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AdminChangelogPage() {
  const [entries, setEntries]       = useState<Entry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [form, setForm]             = useState(EMPTY);
  const [editId, setEditId]         = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [showForm, setShowForm]     = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/changelog");
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch {
      setError("Failed to load entries");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function startCreate() {
    setEditId(null);
    setForm(EMPTY);
    setError(null);
    setShowForm(true);
  }

  function startEdit(e: Entry) {
    setEditId(e.id);
    setForm({
      version:     e.version,
      date:        e.date.slice(0, 10),
      category:    e.category,
      title:       e.title,
      description: e.description,
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url    = editId ? `/api/admin/changelog/${editId}` : "/api/admin/changelog";
      const method = editId ? "PATCH" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Save failed");
      }
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this changelog entry?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/admin/changelog/${id}`, { method: "DELETE" });
      await load();
    } catch {
      setError("Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Changelog</h1>
          <p className="text-sm text-text-muted mt-1">Manage public release notes shown to users</p>
        </div>
        <button
          onClick={startCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Entry
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4"
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold text-text-dark">{editId ? "Edit entry" : "New entry"}</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-text-muted hover:text-text-dark p-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1">Version *</label>
              <input
                required
                value={form.version}
                onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                placeholder="e.g. v2.4.1"
                className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1">Date *</label>
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-500 bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1">Title *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Short, punchy headline"
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1">Description *</label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What changed, why it matters, how to use it"
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-dark border border-border rounded-xl hover:bg-bg-light transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : editId ? "Save changes" : "Publish entry"}
            </button>
          </div>
        </form>
      )}

      {/* Entry list */}
      {loading ? (
        <div className="text-sm text-text-muted text-center py-12">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No changelog entries yet</p>
          <p className="text-sm mt-1">Create the first one above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <div key={e.id} className="bg-white rounded-2xl border border-border shadow-sm p-5 flex gap-4">
              {/* Left meta */}
              <div className="flex-shrink-0 min-w-[90px]">
                <p className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5 text-center mb-1.5">
                  {e.version}
                </p>
                <p className="text-[11px] text-text-muted text-center">
                  {new Date(e.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
                <span className={`mt-2 block text-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${CAT_STYLE[e.category]}`}>
                  {e.category.replace("IMPROVEMENT", "IMPROV.")}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-dark text-sm mb-1">{e.title}</p>
                <p className="text-xs text-text-muted leading-relaxed line-clamp-2">{e.description}</p>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex flex-col gap-1.5">
                <button
                  onClick={() => startEdit(e)}
                  className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-bg-light transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(e.id)}
                  disabled={deleting === e.id}
                  className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {deleting === e.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
