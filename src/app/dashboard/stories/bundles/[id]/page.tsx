"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Story {
  id:          string;
  title:       string;
  description: string | null;
  coverUrl:    string | null;
  price:       number;
  isFree:      boolean;
  tags:        string[];
}

interface BundleDetail {
  id:          string;
  title:       string;
  description: string | null;
  bundlePrice: number;
  totalPrice:  number;
  buyers:      number;
  seller:      { name: string };
  stories:     Story[];
  createdAt:   string;
}

const ngn = (v: number) => `₦${v.toLocaleString("en-NG")}`;

export default function BundleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [bundle,    setBundle]    = useState<BundleDetail | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [buying,    setBuying]    = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => {
    fetch(`/api/marketplace/bundles/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setBundle(null);
        else setBundle(d);
      })
      .catch(() => setBundle(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function purchase() {
    setBuying(true);
    setError("");
    try {
      const res  = await fetch(`/api/marketplace/bundles/${id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Purchase failed"); return; }
      setPurchased(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBuying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="p-8 text-center">
        <p className="text-4xl mb-3">📦</p>
        <p className="font-bold text-text-dark mb-4">Bundle not found</p>
        <Link href="/dashboard/stories" className="text-primary text-sm font-semibold hover:underline">
          ← Back to stories
        </Link>
      </div>
    );
  }

  const discount = bundle.totalPrice > 0
    ? Math.round((1 - bundle.bundlePrice / bundle.totalPrice) * 100)
    : 0;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <Link href="/dashboard/stories" className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold mb-6 hover:underline">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Story Market
      </Link>

      {/* Header */}
      <div className="bg-white border border-border rounded-2xl p-6 mb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wide">Bundle</span>
            <h1 className="text-xl font-black text-text-dark mt-2 leading-tight">{bundle.title}</h1>
            <p className="text-sm text-gray-400 mt-0.5">by {bundle.seller.name} · {bundle.buyers} purchased</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-black text-gold">{ngn(bundle.bundlePrice)}</p>
            <p className="text-sm text-gray-400 line-through">{ngn(bundle.totalPrice)}</p>
            <span className="text-xs font-black bg-gold/10 text-gold px-2 py-0.5 rounded-full">Save {discount}%</span>
          </div>
        </div>

        {bundle.description && (
          <p className="text-sm text-gray-500 mb-5">{bundle.description}</p>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        {purchased ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
            <p className="text-green-700 font-bold text-sm">Purchase successful! Enjoy your stories.</p>
          </div>
        ) : (
          <button
            onClick={purchase}
            disabled={buying}
            className="w-full bg-primary text-white font-black py-3.5 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
          >
            {buying ? "Processing…" : `Buy Bundle for ${ngn(bundle.bundlePrice)}`}
          </button>
        )}
      </div>

      {/* Stories in bundle */}
      <div>
        <p className="text-sm font-bold text-text-dark mb-3">{bundle.stories.length} Stories Included</p>
        <div className="space-y-3">
          {bundle.stories.map((story) => (
            <div key={story.id} className="bg-white border border-border rounded-2xl p-4 flex items-start gap-3">
              <div className="w-12 h-16 rounded-xl overflow-hidden shrink-0 bg-primary/10">
                {story.coverUrl ? (
                  <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-2xl">📚</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-text-dark text-sm">{story.title}</p>
                {story.description && (
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{story.description}</p>
                )}
                {story.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {story.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] bg-bg-light text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-sm font-bold text-gold shrink-0">{ngn(story.price)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
