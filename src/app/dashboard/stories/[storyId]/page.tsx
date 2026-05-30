"use client";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";

// ── Mock data ────────────────────────────────────────────────

type Episode = {
  num: number;
  title: string;
  duration: string;
  isFree: boolean;
  price: number;
  description: string;
};

type StoryDetail = {
  id: string;
  title: string;
  description: string;
  seller: {
    name: string;
    avatar: string;
    bio: string;
    storiesCount: number;
    totalBuyers: number;
    rating: number;
  };
  price: number;
  niche: string;
  royalty: boolean;
  royaltyPct: number;
  episodeCount: number;
  coverGradient: string;
  coverEmoji: string;
  rating: number;
  buyers: number;
  tags: string[];
  episodes: Episode[];
  previewSrc: string;
};

const STORY_DB: Record<string, StoryDetail> = {
  "1": {
    id: "1",
    title: "The Billionaire's Algorithm",
    description:
      "A gripping journey into the mind of a self-made billionaire who used artificial intelligence to disrupt three industries in five years. This story reveals the mindset, the sacrifices, the secret strategies, and the hard-won wisdom behind building a tech empire from a one-bedroom apartment in Lagos. Each episode unlocks a new chapter of raw, unfiltered lessons.",
    seller: {
      name: "TechMaster Pro",
      avatar: "T",
      bio: "Serial entrepreneur, AI researcher, and author of 3 bestselling business guides on BAUIN.",
      storiesCount: 7,
      totalBuyers: 1842,
      rating: 4.8,
    },
    price: 2500,
    niche: "AI & Tech",
    royalty: true,
    royaltyPct: 15,
    episodeCount: 12,
    coverGradient: "from-[#1A6659] via-[#0E4A3D] to-[#092e27]",
    coverEmoji: "🤖",
    rating: 4.8,
    buyers: 342,
    tags: ["AI", "Entrepreneurship", "Tech", "Wealth"],
    previewSrc: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    episodes: [
      { num: 1, title: "The Spark: When I Saw the Gap", duration: "18 min", isFree: true, price: 0, description: "The moment that changed everything — a $0 idea in a Lagos taxi." },
      { num: 2, title: "Building the First Version", duration: "22 min", isFree: false, price: 300, description: "Coding nights, zero funding, and the first paying customer." },
      { num: 3, title: "The Algorithm That Changed Everything", duration: "25 min", isFree: false, price: 300, description: "How a simple machine learning model became a $2M product." },
      { num: 4, title: "Raising the First Round", duration: "20 min", isFree: false, price: 300, description: "Pitching 47 investors before landing the first yes." },
      { num: 5, title: "The Team That Nearly Broke Me", duration: "28 min", isFree: false, price: 300, description: "Hiring, firing, and the human cost of ambition." },
      { num: 6, title: "Scale or Die", duration: "24 min", isFree: false, price: 300, description: "The inflection point when growth turned exponential." },
      { num: 7, title: "Competition & Copycats", duration: "19 min", isFree: false, price: 300, description: "When three VC-backed startups tried to clone the product." },
      { num: 8, title: "The First $10M Month", duration: "23 min", isFree: false, price: 300, description: "Celebration, taxes, and the loneliness of the top." },
      { num: 9, title: "Diversification: Industry 2", duration: "26 min", isFree: false, price: 300, description: "Entering fintech with battle-tested AI infrastructure." },
      { num: 10, title: "The Acquisition Offer I Refused", duration: "21 min", isFree: false, price: 300, description: "$80M on the table. Why I said no." },
      { num: 11, title: "Philanthropy & Purpose", duration: "17 min", isFree: false, price: 300, description: "What wealth means when you have enough." },
      { num: 12, title: "The Algorithm for Your Life", duration: "30 min", isFree: false, price: 300, description: "The exact framework you can apply starting today." },
    ],
  },
  "2": {
    id: "2",
    title: "Digital Empire: Build Wealth Online",
    description:
      "Eight transformative episodes tracing one man's path from a government job to a ₦200M online media empire. This is not theory — every step is documented with actual numbers, real mistakes, and repeatable strategies for building digital income streams in Africa's fastest-growing economy.",
    seller: {
      name: "FinanceGuru",
      avatar: "F",
      bio: "Financial educator with 10+ years building online businesses. Has trained 5,000+ entrepreneurs.",
      storiesCount: 4,
      totalBuyers: 963,
      rating: 4.6,
    },
    price: 1500,
    niche: "Finance",
    royalty: true,
    royaltyPct: 20,
    episodeCount: 8,
    coverGradient: "from-[#1e3a8a] via-[#1e40af] to-[#1d4ed8]",
    coverEmoji: "💰",
    rating: 4.6,
    buyers: 218,
    tags: ["Finance", "Digital Business", "Wealth", "Online Income"],
    previewSrc: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    episodes: [
      { num: 1, title: "The ₦180,000 Salary Trap", duration: "20 min", isFree: true, price: 0, description: "Why I quit a government job that everyone called stable." },
      { num: 2, title: "First ₦1M Online", duration: "24 min", isFree: false, price: 250, description: "The digital product that made me believe this was real." },
      { num: 3, title: "Building Multiple Income Streams", duration: "22 min", isFree: false, price: 250, description: "How I run 5 income streams simultaneously." },
      { num: 4, title: "Audience First, Product Second", duration: "18 min", isFree: false, price: 250, description: "The sequence most entrepreneurs get backward." },
      { num: 5, title: "The Email List That Made Millions", duration: "26 min", isFree: false, price: 250, description: "Building a 50,000-subscriber list from zero." },
      { num: 6, title: "Outsourcing Without Losing Control", duration: "19 min", isFree: false, price: 250, description: "Managing a virtual team across three time zones." },
      { num: 7, title: "Tax, Legal & Banking for Creators", duration: "21 min", isFree: false, price: 250, description: "The boring stuff that protects your wealth." },
      { num: 8, title: "The Empire Blueprint", duration: "35 min", isFree: false, price: 250, description: "The complete roadmap in one final episode." },
    ],
  },
};

// Fallback for stories not in DB
function getFallbackStory(id: string): StoryDetail {
  return {
    id,
    title: "Story #" + id,
    description: "This story is coming soon. Stay tuned for an incredible journey that will change how you see wealth, technology, and opportunity.",
    seller: {
      name: "BAUIN Author",
      avatar: "B",
      bio: "Experienced BAUIN creator.",
      storiesCount: 1,
      totalBuyers: 0,
      rating: 5.0,
    },
    price: 1500,
    niche: "Business",
    royalty: true,
    royaltyPct: 15,
    episodeCount: 5,
    coverGradient: "from-[#1A6659] to-[#0E4A3D]",
    coverEmoji: "📖",
    rating: 5.0,
    buyers: 0,
    tags: ["Business"],
    previewSrc: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    episodes: [
      { num: 1, title: "Episode 1", duration: "20 min", isFree: true, price: 0, description: "The beginning of an incredible story." },
      { num: 2, title: "Episode 2", duration: "22 min", isFree: false, price: 300, description: "Coming soon." },
      { num: 3, title: "Episode 3", duration: "24 min", isFree: false, price: 300, description: "Coming soon." },
      { num: 4, title: "Episode 4", duration: "21 min", isFree: false, price: 300, description: "Coming soon." },
      { num: 5, title: "Episode 5", duration: "25 min", isFree: false, price: 300, description: "Coming soon." },
    ],
  };
}

// ── Preview Player ────────────────────────────────────────────

const PREVIEW_LIMIT = 30;

function PreviewPlayer({ src, onClose }: { src: string; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [ended, setEnded] = useState(false);

  function toggle() {
    const v = videoRef.current;
    if (!v || ended) return;
    if (playing) { v.pause(); setPlaying(false); }
    else { v.play().catch(() => {}); setPlaying(true); }
  }

  function onTimeUpdate() {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    setElapsed(t);
    if (t >= PREVIEW_LIMIT) {
      v.pause();
      setPlaying(false);
      setEnded(true);
    }
  }

  const progress = Math.min((elapsed / PREVIEW_LIMIT) * 100, 100);
  const remaining = Math.max(0, PREVIEW_LIMIT - Math.floor(elapsed));

  return (
    <div className="mt-3 bg-black rounded-xl overflow-hidden shadow-lg">
      {/* Hidden native video for audio/video decoding */}
      <video
        ref={videoRef}
        src={src}
        onTimeUpdate={onTimeUpdate}
        onEnded={() => { setPlaying(false); setEnded(true); }}
        className="w-full max-h-48 object-cover"
        playsInline
      />

      {/* Controls overlay */}
      <div className="bg-gray-900 px-4 py-3">
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-white/20 rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={toggle}
              disabled={ended}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                ended ? "bg-white/10 cursor-not-allowed" : "bg-primary hover:bg-primary-dark"
              }`}
            >
              {playing ? (
                <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5 ml-0.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>

            <div>
              {ended ? (
                <p className="text-xs text-gold font-semibold">Preview ended</p>
              ) : (
                <p className="text-xs text-white/70">
                  {remaining}s remaining
                </p>
              )}
              <p className="text-[10px] text-white/40">30-second free preview</p>
            </div>
          </div>

          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {ended && (
          <div className="mt-3 pt-3 border-t border-white/10 text-center">
            <p className="text-xs text-white/60 mb-2">Enjoyed the preview? Get full access.</p>
            <button className="w-full py-2 bg-gold text-text-dark text-xs font-black rounded-lg">
              Purchase Full Story
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Episode Row ───────────────────────────────────────────────

function EpisodeRow({
  ep,
  previewSrc,
  isFirstUnlocked,
}: {
  ep: Episode;
  previewSrc: string;
  isFirstUnlocked: boolean;
}) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div
      className={`rounded-2xl border transition-colors ${
        ep.isFree
          ? "bg-white border-primary/20 shadow-sm"
          : "bg-white border-border"
      }`}
    >
      <div className="flex items-start gap-4 p-4">
        {/* Episode number */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black ${
            ep.isFree ? "bg-primary text-white" : "bg-bg-light text-gray-400"
          }`}
        >
          {ep.isFree ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
              <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
            </svg>
          ) : (
            ep.num
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div>
              <p className={`text-sm font-semibold leading-snug ${ep.isFree ? "text-text-dark" : "text-gray-600"}`}>
                {ep.title}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{ep.duration}</p>
            </div>
            {ep.isFree ? (
              <span className="flex-shrink-0 text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                FREE
              </span>
            ) : (
              <span className="flex-shrink-0 text-xs font-black text-gold">
                ₦{ep.price.toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{ep.description}</p>
        </div>

        {/* Lock icon for non-free */}
        {!ep.isFree && (
          <div className="flex-shrink-0 mt-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-gray-300">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
        )}
      </div>

      {/* Preview button for free episode */}
      {ep.isFree && isFirstUnlocked && (
        <div className="px-4 pb-4">
          {!showPreview ? (
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-dark transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
              </svg>
              Watch 30-second Preview
            </button>
          ) : (
            <PreviewPlayer src={previewSrc} onClose={() => setShowPreview(false)} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Star Rating ────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" className="w-4 h-4" fill={i < full ? "#F0B429" : i === full && half ? "#F0B429" : "#e5e7eb"}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-xs font-bold text-gray-700 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function StoryDetailPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const router = useRouter();
  const story = STORY_DB[storyId] ?? getFallbackStory(storyId);

  const [copied, setCopied] = useState(false);

  function copyReferral() {
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/stories/${story.id}?ref=ME`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="min-h-screen bg-bg-light">
      {/* ── Cover banner ────────────────────────────────────── */}
      <div className={`relative w-full h-56 md:h-72 bg-gradient-to-br ${story.coverGradient} overflow-hidden`}>
        {/* Decorative circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute -bottom-8 left-16 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute top-8 left-1/3 w-64 h-64 bg-white/5 rounded-full" />

        {/* Big emoji */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-8xl md:text-9xl drop-shadow-2xl opacity-30 select-none">
            {story.coverEmoji}
          </span>
        </div>

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-xl hover:bg-white/20 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        {/* ROYALTY badge */}
        {story.royalty && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-gold text-text-dark text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
              <path d="M3 5l7-3 7 3v8l-7 3-7-3V5z" />
            </svg>
            ROYALTY {story.royaltyPct}%
          </div>
        )}

        {/* Title overlay at bottom */}
        <div className="absolute bottom-0 inset-x-0 p-5">
          <div className="flex items-end gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-gold/90 uppercase tracking-widest">
                {story.niche}
              </span>
              <h1 className="text-xl md:text-2xl font-black text-white leading-tight mt-0.5 drop-shadow">
                {story.title}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column: description + episodes ───────── */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4">
              <Stars rating={story.rating} />
              <span className="text-sm text-gray-500">
                <span className="font-semibold text-text-dark">{story.buyers.toLocaleString()}</span> readers
              </span>
              <span className="text-sm text-gray-500">
                <span className="font-semibold text-text-dark">{story.episodeCount}</span> episodes
              </span>
              <div className="flex flex-wrap gap-1.5">
                {story.tags.map((tag) => (
                  <span key={tag} className="text-[11px] bg-primary/10 text-primary font-medium px-2.5 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Description card */}
            <div className="bg-white border border-border rounded-2xl p-5">
              <h2 className="text-sm font-bold text-text-dark mb-2">About This Story</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{story.description}</p>
            </div>

            {/* Price + CTA */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 bg-white border border-border rounded-2xl px-5 py-4">
                <p className="text-xs text-gray-500 mb-0.5">Full story access</p>
                <p className="text-2xl font-black text-gold">₦{story.price.toLocaleString()}</p>
              </div>
              <button className="flex-1 py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl transition-colors text-sm shadow-sm">
                Purchase Full Access
              </button>
            </div>

            {/* Episodes */}
            <div>
              <h2 className="text-sm font-bold text-text-dark mb-3">
                All Episodes · {story.episodeCount} total
              </h2>
              <div className="flex flex-col gap-3">
                {story.episodes.map((ep) => (
                  <EpisodeRow
                    key={ep.num}
                    ep={ep}
                    previewSrc={story.previewSrc}
                    isFirstUnlocked={ep.num === 1}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Right column: seller card + royalty box ─────── */}
          <div className="flex flex-col gap-5">

            {/* Seller card */}
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Author</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white text-lg font-black flex-shrink-0">
                  {story.seller.avatar}
                </div>
                <div>
                  <p className="font-bold text-text-dark text-sm">{story.seller.name}</p>
                  <Stars rating={story.seller.rating} />
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">{story.seller.bio}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-light rounded-xl p-3 text-center">
                  <p className="text-base font-black text-primary">{story.seller.storiesCount}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Stories</p>
                </div>
                <div className="bg-bg-light rounded-xl p-3 text-center">
                  <p className="text-base font-black text-primary">
                    {story.seller.totalBuyers.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Readers</p>
                </div>
              </div>
              <button className="mt-4 w-full py-2.5 border border-primary text-primary text-sm font-semibold rounded-xl hover:bg-primary hover:text-white transition-colors">
                View Profile
              </button>
            </div>

            {/* Royalty gold box */}
            {story.royalty && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gold to-[#E09000] p-5 shadow-sm">
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
                <div className="absolute -bottom-6 -left-2 w-16 h-16 bg-white/10 rounded-full" />

                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4">
                        <path d="M3 5l7-3 7 3v8l-7 3-7-3V5z" />
                      </svg>
                    </div>
                    <p className="font-black text-text-dark text-sm">Royalty Programme</p>
                  </div>
                  <p className="text-text-dark/80 text-xs leading-relaxed mb-4">
                    Share this story and earn{" "}
                    <span className="font-black text-text-dark">{story.royaltyPct}%</span>{" "}
                    on every sale made through your unique link — forever.
                  </p>

                  {/* Earnings example */}
                  <div className="bg-white/30 rounded-xl p-3 mb-4">
                    <p className="text-[10px] text-text-dark/70 font-semibold uppercase tracking-wide mb-2">
                      Example earnings
                    </p>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-dark/70">10 referrals</span>
                      <span className="font-black text-text-dark">
                        ₦{((story.price * story.royaltyPct) / 100 * 10).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-text-dark/70">50 referrals</span>
                      <span className="font-black text-text-dark">
                        ₦{((story.price * story.royaltyPct) / 100 * 50).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={copyReferral}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                      copied
                        ? "bg-green-600 text-white"
                        : "bg-text-dark text-white hover:bg-black"
                    }`}
                  >
                    {copied ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Referral Link Copied!
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                        </svg>
                        Copy Referral Link
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Share card (non-royalty) */}
            {!story.royalty && (
              <div className="bg-white border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-primary">
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="font-bold text-text-dark text-sm">Share this Story</p>
                </div>
                <p className="text-xs text-gray-500 mb-3">Help others discover great content.</p>
                <button className="w-full py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors">
                  Share Story
                </button>
              </div>
            )}

            {/* Quick stats */}
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Story Details</h3>
              <div className="flex flex-col gap-2.5">
                {[
                  { label: "Category", value: story.niche },
                  { label: "Episodes", value: String(story.episodeCount) },
                  { label: "Price", value: `₦${story.price.toLocaleString()}` },
                  { label: "Readers", value: story.buyers.toLocaleString() },
                  { label: "Rating", value: `${story.rating}/5.0` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-xs font-semibold text-text-dark">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
