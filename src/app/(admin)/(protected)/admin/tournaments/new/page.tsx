"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type FormState = {
  name:          string;
  description:   string;
  entryFee:      string;
  prizePool:     string;
  quizSessionId: string;
  date:          string;
};

export default function NewTournamentPage() {
  const router = useRouter();
  const [form, setForm]     = useState<FormState>({
    name: "", description: "", entryFee: "", prizePool: "", quizSessionId: "", date: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  function update(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim())          { setError("Name is required"); return; }
    if (!form.entryFee)             { setError("Entry fee is required"); return; }
    if (!form.prizePool)            { setError("Prize pool is required"); return; }
    if (!form.quizSessionId.trim()) { setError("Quiz session ID is required"); return; }
    if (!form.date)                 { setError("Date is required"); return; }

    setSubmitting(true);
    try {
      const r = await fetch("/api/admin/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:          form.name.trim(),
          description:   form.description.trim() || undefined,
          entryFee:      Number(form.entryFee),
          prizePool:     Number(form.prizePool),
          quizSessionId: form.quizSessionId.trim(),
          date:          new Date(form.date).toISOString(),
        }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "Failed to create tournament"); return; }
      router.push(`/admin/tournaments`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Back */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/tournaments"
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-gray-600">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="text-xl font-black text-text-dark">New Tournament</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Tournament Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="e.g. Grand Championship S1"
            className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-dark outline-none focus:border-primary"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Describe the tournament…"
            rows={3}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-dark outline-none focus:border-primary resize-none"
          />
        </div>

        {/* Entry fee + Prize pool */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Entry Fee (₦) *</label>
            <input
              type="number"
              min={0}
              step={100}
              value={form.entryFee}
              onChange={(e) => update("entryFee", e.target.value)}
              placeholder="e.g. 2000"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-dark outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Prize Pool (₦) *</label>
            <input
              type="number"
              min={0}
              step={1000}
              value={form.prizePool}
              onChange={(e) => update("prizePool", e.target.value)}
              placeholder="e.g. 500000"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-dark outline-none focus:border-primary"
              required
            />
          </div>
        </div>

        {/* Quiz session ID */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Quiz Session ID *</label>
          <input
            type="text"
            value={form.quizSessionId}
            onChange={(e) => update("quizSessionId", e.target.value)}
            placeholder="cuid of the quiz session"
            className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-dark outline-none focus:border-primary font-mono"
            required
          />
          <p className="text-[11px] text-gray-400 mt-1">The quiz session whose leaderboard drives this tournament.</p>
        </div>

        {/* Date */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Tournament Date *</label>
          <input
            type="datetime-local"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-dark outline-none focus:border-primary"
            required
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-50 mt-2"
        >
          {submitting ? "Creating…" : "Create Tournament"}
        </button>
      </form>
    </div>
  );
}
