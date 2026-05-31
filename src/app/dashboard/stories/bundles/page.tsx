"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface StoryOption {
  id:       string;
  title:    string;
  coverUrl: string | null;
  price:    number;
}

interface Bundle {
  id:          string;
  title:       string;
  description: string | null;
  bundlePrice: number;
  isPublished: boolean;
  buyers:      number;
  totalPrice:  number;
  stories:     StoryOption[];
  createdAt:   string;
}

const ngn = (v: number) => `₦${v.toLocaleString("en-NG")}`;

function CoverStack({ stories }: { stories: StoryOption[] }) {
  const shown = stories.slice(0, 3);
  return (
    <div className="relative h-14 w-24 shrink-0">
      {shown.map((s, i) => (
        <div
          key={s.id}
          className="absolute top-0 w-12 h-14 rounded-lg overflow-hidden border-2 border-white shadow-sm bg-primary/20"
          style={{ left: i * 12, zIndex: shown.length - i }}
        >
          {s.coverUrl ? (
            <img src={s.coverUrl} alt={s.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-primary to-primary-dark flex items-center justify-center">
              <span className="text-white text-lg">📚</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BundleCard({ bundle, onTogglePublish, onDelete }: { bundle: Bundle; onTogglePublish: () => void; onDelete: () => void }) {
  const discount = bundle.totalPrice > 0
    ? Math.round((1 - bundle.bundlePrice / bundle.totalPrice) * 100)
    : 0;

  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <div className="flex items-start gap-4 mb-3">
        <CoverStack stories={bundle.stories} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-text-dark text-sm leading-snug">{bundle.title}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
              bundle.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}>
              {bundle.isPublished ? "Live" : "Draft"}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{bundle.stories.length} stories · {bundle.buyers} purchased</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-black text-gold">{ngn(bundle.bundlePrice)}</span>
            <span className="text-xs text-gray-400 line-through">{ngn(bundle.totalPrice)}</span>
            <span className="text-[10px] font-bold bg-gold/10 text-gold px-1.5 py-0.5 rounded-full">−{discount}%</span>
          </div>
        </div>
      </div>
      {bundle.description && (
        <p className="text-xs text-gray-400 mb-3 line-clamp-2">{bundle.description}</p>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePublish}
          className={`flex-1 text-xs font-bold py-2 rounded-xl transition-colors ${
            bundle.isPublished
              ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
              : "bg-primary text-white hover:bg-primary-dark"
          }`}
        >
          {bundle.isPublished ? "Unpublish" : "Publish"}
        </button>
        <button
          onClick={onDelete}
          className="text-xs font-bold py-2 px-4 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function CreateBundleForm({ onCreated }: { onCreated: (b: Bundle) => void }) {
  const [title,        setTitle]        = useState("");
  const [description,  setDescription]  = useState("");
  const [bundlePrice,  setBundlePrice]  = useState("");
  const [stories,      setStories]      = useState<StoryOption[]>([]);
  const [selectedIds,  setSelectedIds]  = useState<string[]>([]);
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [loadingStories, setLoadingStories] = useState(true);

  useEffect(() => {
    fetch("/api/seller/stories")
      .then((r) => r.json())
      .then((d) => setStories(d.stories ?? []))
      .catch(() => {})
      .finally(() => setLoadingStories(false));
  }, []);

  function toggleStory(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 5 ? [...prev, id] : prev,
    );
  }

  const sumSelected = stories
    .filter((s) => selectedIds.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0);

  const priceNum = Number(bundlePrice);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) { setError("Title is required"); return; }
    if (selectedIds.length < 3) { setError("Select at least 3 stories"); return; }
    if (!bundlePrice || isNaN(priceNum) || priceNum <= 0) { setError("Enter a valid price"); return; }
    if (priceNum >= sumSelected) {
      setError(`Price must be less than the sum of selected story prices (${ngn(sumSelected)})`);
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch("/api/seller/bundles", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ title, description: description || undefined, storyIds: selectedIds, bundlePrice: priceNum }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create bundle"); return; }
      onCreated(data.bundle);
      setTitle(""); setDescription(""); setBundlePrice(""); setSelectedIds([]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-border rounded-2xl p-5 space-y-4">
      <h3 className="font-bold text-text-dark">Create Bundle</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      <div>
        <label className="block text-xs font-semibold text-text-dark mb-1">Bundle Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. AI & Finance Starter Pack"
          className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-dark mb-1">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="What's special about this bundle?"
          className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-text-dark">
            Select Stories <span className="text-gray-400 font-normal">(3–5)</span>
          </label>
          <span className={`text-xs font-bold ${selectedIds.length < 3 ? "text-gray-400" : "text-primary"}`}>
            {selectedIds.length}/5 selected
          </span>
        </div>
        {loadingStories ? (
          <div className="text-xs text-gray-400 py-4 text-center">Loading your stories…</div>
        ) : stories.length === 0 ? (
          <div className="text-xs text-gray-400 py-4 text-center">No published stories found. Create some stories first.</div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {stories.map((s) => {
              const sel = selectedIds.includes(s.id);
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => toggleStory(s.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                    sel ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                    sel ? "bg-primary border-primary" : "border-gray-300"
                  }`}>
                    {sel && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span className="flex-1 text-sm font-medium text-text-dark truncate">{s.title}</span>
                  <span className="text-xs font-bold text-gold shrink-0">{ngn(s.price)}</span>
                </button>
              );
            })}
          </div>
        )}
        {selectedIds.length > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            Individual total: <strong className="text-text-dark">{ngn(sumSelected)}</strong>
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-dark mb-1">Bundle Price (₦)</label>
        <input
          type="number"
          min={0}
          step={1}
          value={bundlePrice}
          onChange={(e) => setBundlePrice(e.target.value)}
          placeholder={sumSelected > 0 ? `Less than ${ngn(sumSelected)}` : "e.g. 3500"}
          className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        {priceNum > 0 && sumSelected > 0 && (
          <p className={`text-xs mt-1 ${priceNum < sumSelected ? "text-green-600" : "text-red-500"}`}>
            {priceNum < sumSelected
              ? `Saves buyers ${ngn(sumSelected - priceNum)} (${Math.round((1 - priceNum / sumSelected) * 100)}% off)`
              : `Must be less than ${ngn(sumSelected)}`}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
      >
        {loading ? "Creating…" : "Create Bundle"}
      </button>
    </form>
  );
}

export default function SellerBundlesPage() {
  const { status } = useSession();
  const [bundles,  setBundles]  = useState<Bundle[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/seller/bundles")
      .then((r) => r.json())
      .then((d) => setBundles(d.bundles ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  async function togglePublish(id: string) {
    const res = await fetch(`/api/seller/bundles/${id}/publish`, { method: "PATCH" });
    if (!res.ok) return;
    const { isPublished } = await res.json();
    setBundles((prev) => prev.map((b) => b.id === id ? { ...b, isPublished } : b));
  }

  async function deleteBundle(id: string) {
    if (!confirm("Delete this bundle? This cannot be undone.")) return;
    const res = await fetch(`/api/seller/bundles/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setBundles((prev) => prev.filter((b) => b.id !== id));
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Story Bundles</h1>
          <p className="text-sm text-gray-500 mt-0.5">Package 3–5 stories at a discount</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Bundle
        </button>
      </div>

      {showForm && (
        <div className="mb-6">
          <CreateBundleForm
            onCreated={(b) => {
              setBundles((prev) => [b, ...prev]);
              setShowForm(false);
            }}
          />
        </div>
      )}

      {bundles.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl px-6 py-16 text-center">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-bold text-text-dark mb-1">No bundles yet</p>
          <p className="text-gray-400 text-sm">Create your first bundle to offer stories at a discount.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bundles.map((b) => (
            <BundleCard
              key={b.id}
              bundle={b}
              onTogglePublish={() => togglePublish(b.id)}
              onDelete={() => deleteBundle(b.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
