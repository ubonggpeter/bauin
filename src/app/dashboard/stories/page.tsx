"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const NICHES = ["All", "Business", "AI & Tech", "Finance", "Romance", "Self-Help", "Crypto", "Mystery"];

// ── Bundle marketplace types ──
interface BundleStory { id: string; title: string; coverUrl: string | null; price: number; }
interface MarketBundle {
  id: string; title: string; description: string | null;
  bundlePrice: number; totalPrice: number; buyers: number;
  seller: { name: string }; stories: BundleStory[]; storyCount: number;
}

function BundleCoverStack({ stories }: { stories: BundleStory[] }) {
  const shown = stories.slice(0, 3);
  return (
    <div className="relative h-16 w-28 shrink-0">
      {shown.map((s, i) => (
        <div
          key={s.id}
          className="absolute top-0 w-12 h-16 rounded-xl overflow-hidden border-2 border-white shadow bg-primary/20"
          style={{ left: i * 14, zIndex: shown.length - i }}
        >
          {s.coverUrl ? (
            <img src={s.coverUrl} alt={s.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-primary to-primary-dark flex items-center justify-center">
              <span className="text-white text-xl">📚</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BundleCard({ bundle }: { bundle: MarketBundle }) {
  const discount = bundle.totalPrice > 0
    ? Math.round((1 - bundle.bundlePrice / bundle.totalPrice) * 100)
    : 0;
  return (
    <div className="bg-white border border-border rounded-2xl p-4 hover:border-primary/40 hover:shadow-sm transition-all">
      <div className="flex items-center gap-4 mb-3">
        <BundleCoverStack stories={bundle.stories} />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-text-dark text-sm leading-snug line-clamp-2">{bundle.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{bundle.storyCount} stories · {bundle.seller.name}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-sm font-black text-gold">₦{bundle.bundlePrice.toLocaleString()}</span>
            <span className="text-xs text-gray-400 line-through">₦{bundle.totalPrice.toLocaleString()}</span>
            <span className="text-[10px] font-black bg-gold/10 text-gold px-1.5 py-0.5 rounded-full">−{discount}%</span>
          </div>
        </div>
      </div>
      {bundle.description && (
        <p className="text-xs text-gray-400 mb-3 line-clamp-2">{bundle.description}</p>
      )}
      <Link
        href={`/dashboard/stories/bundles/${bundle.id}`}
        className="block w-full text-center bg-primary text-white text-xs font-bold py-2 rounded-xl hover:bg-primary-dark transition-colors"
      >
        View Bundle
      </Link>
    </div>
  );
}

function BundlesSection() {
  const [bundles, setBundles] = useState<MarketBundle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/marketplace/bundles")
      .then((r) => r.json())
      .then((d) => setBundles(d.bundles ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (bundles.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-text-dark">Story Bundles</h2>
          <p className="text-xs text-gray-400">Save more buying stories together</p>
        </div>
        <Link href="/dashboard/stories/bundles" className="text-xs text-primary font-semibold hover:underline">
          Manage bundles →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bundles.map((b) => <BundleCard key={b.id} bundle={b} />)}
      </div>
    </div>
  );
}

type Story = {
  id: string;
  title: string;
  seller: { name: string; avatar: string };
  price: number;
  niche: string;
  royalty: boolean;
  royaltyPct: number;
  episodeCount: number;
  coverGradient: string;
  coverEmoji: string;
  rating: number;
  buyers: number;
};

const STORIES: Story[] = [
  {
    id: "1",
    title: "The Billionaire's Algorithm",
    seller: { name: "TechMaster Pro", avatar: "T" },
    price: 2500,
    niche: "AI & Tech",
    royalty: true,
    royaltyPct: 15,
    episodeCount: 12,
    coverGradient: "from-[#1A6659] to-[#0E4A3D]",
    coverEmoji: "🤖",
    rating: 4.8,
    buyers: 342,
  },
  {
    id: "2",
    title: "Digital Empire: Build Wealth Online",
    seller: { name: "FinanceGuru", avatar: "F" },
    price: 1500,
    niche: "Finance",
    royalty: true,
    royaltyPct: 20,
    episodeCount: 8,
    coverGradient: "from-[#1e3a8a] to-[#1e40af]",
    coverEmoji: "💰",
    rating: 4.6,
    buyers: 218,
  },
  {
    id: "3",
    title: "Code to Millions",
    seller: { name: "DevPro254", avatar: "D" },
    price: 3000,
    niche: "AI & Tech",
    royalty: false,
    royaltyPct: 0,
    episodeCount: 15,
    coverGradient: "from-[#4c1d95] to-[#6d28d9]",
    coverEmoji: "💻",
    rating: 4.9,
    buyers: 507,
  },
  {
    id: "4",
    title: "The Crypto King Chronicles",
    seller: { name: "CryptoKing", avatar: "C" },
    price: 2000,
    niche: "Crypto",
    royalty: true,
    royaltyPct: 10,
    episodeCount: 10,
    coverGradient: "from-[#92400e] to-[#b45309]",
    coverEmoji: "₿",
    rating: 4.5,
    buyers: 289,
  },
  {
    id: "5",
    title: "Millionaire Mindset Mastery",
    seller: { name: "MindCoach", avatar: "M" },
    price: 1200,
    niche: "Self-Help",
    royalty: false,
    royaltyPct: 0,
    episodeCount: 6,
    coverGradient: "from-[#065f46] to-[#047857]",
    coverEmoji: "🧠",
    rating: 4.7,
    buyers: 431,
  },
  {
    id: "6",
    title: "Silicon Valley Love Story",
    seller: { name: "RomanceWriter", avatar: "R" },
    price: 1000,
    niche: "Romance",
    royalty: true,
    royaltyPct: 25,
    episodeCount: 20,
    coverGradient: "from-[#9d174d] to-[#be185d]",
    coverEmoji: "💝",
    rating: 4.4,
    buyers: 156,
  },
  {
    id: "7",
    title: "The DeFi Revolution",
    seller: { name: "BlockchainBoss", avatar: "B" },
    price: 2200,
    niche: "Crypto",
    royalty: true,
    royaltyPct: 15,
    episodeCount: 9,
    coverGradient: "from-[#1c1917] to-[#44403c]",
    coverEmoji: "⛓️",
    rating: 4.6,
    buyers: 198,
  },
  {
    id: "8",
    title: "Business Secrets of the Ultra Rich",
    seller: { name: "BizElite", avatar: "B" },
    price: 3500,
    niche: "Business",
    royalty: false,
    royaltyPct: 0,
    episodeCount: 18,
    coverGradient: "from-[#0f172a] to-[#1e293b]",
    coverEmoji: "🏆",
    rating: 4.9,
    buyers: 634,
  },
  {
    id: "9",
    title: "The Dark Web Billionaire",
    seller: { name: "CyberPunk99", avatar: "C" },
    price: 1800,
    niche: "Mystery",
    royalty: true,
    royaltyPct: 12,
    episodeCount: 14,
    coverGradient: "from-[#18181b] to-[#27272a]",
    coverEmoji: "🕵️",
    rating: 4.3,
    buyers: 127,
  },
  {
    id: "10",
    title: "From Zero to $1M: True Story",
    seller: { name: "WealthCoach", avatar: "W" },
    price: 2800,
    niche: "Business",
    royalty: true,
    royaltyPct: 18,
    episodeCount: 11,
    coverGradient: "from-[#14532d] to-[#166534]",
    coverEmoji: "🚀",
    rating: 4.8,
    buyers: 412,
  },
  {
    id: "11",
    title: "The AI Girlfriend Experiment",
    seller: { name: "SciFiAuthor", avatar: "S" },
    price: 900,
    niche: "Romance",
    royalty: false,
    royaltyPct: 0,
    episodeCount: 7,
    coverGradient: "from-[#831843] to-[#9d174d]",
    coverEmoji: "🤍",
    rating: 4.2,
    buyers: 89,
  },
  {
    id: "12",
    title: "DeFi Secrets That Made Me Rich",
    seller: { name: "CryptoWizard", avatar: "C" },
    price: 2600,
    niche: "Finance",
    royalty: true,
    royaltyPct: 22,
    episodeCount: 13,
    coverGradient: "from-[#7c3aed] to-[#6d28d9]",
    coverEmoji: "💎",
    rating: 4.7,
    buyers: 276,
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      <svg viewBox="0 0 20 20" fill="#F0B429" className="w-3 h-3">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <span className="text-xs font-semibold text-gray-600">{rating.toFixed(1)}</span>
    </span>
  );
}

function StoryCard({ story }: { story: Story }) {
  return (
    <Link href={`/dashboard/stories/${story.id}`} className="group flex flex-col">
      {/* Cover */}
      <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden mb-3 shadow-sm group-hover:shadow-md transition-shadow">
        <div className={`absolute inset-0 bg-gradient-to-b ${story.coverGradient}`} />
        {/* Emoji centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl drop-shadow-lg">{story.coverEmoji}</span>
        </div>
        {/* Episode count badge */}
        <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
          {story.episodeCount} episodes
        </div>
        {/* Royalty badge */}
        {story.royalty && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-gold text-[10px] font-black text-text-dark px-2 py-0.5 rounded-full shadow">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5">
              <path d="M3 5l7-3 7 3v8l-7 3-7-3V5z" />
            </svg>
            ROYALTY
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-text-dark leading-snug line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
          {story.title}
        </h3>
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-black flex-shrink-0">
            {story.seller.avatar}
          </div>
          <span className="text-xs text-gray-500 truncate">{story.seller.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-black text-gold">₦{story.price.toLocaleString()}</span>
          <div className="flex items-center gap-2">
            <StarRating rating={story.rating} />
            <span className="text-[10px] text-gray-400">({story.buyers})</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-400">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function StoriesPage() {
  const [niche, setNiche] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = STORIES.filter((s) => {
    const matchNiche = niche === "All" || s.niche === niche;
    const q = query.toLowerCase();
    const matchSearch = !q || s.title.toLowerCase().includes(q) || s.seller.name.toLowerCase().includes(q);
    return matchNiche && matchSearch;
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Story Market</h1>
          <p className="text-sm text-gray-500 mt-1">Discover stories, earn royalties when you share</p>
        </div>
        <Link
          href="/dashboard/stories/create"
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors shadow-sm"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Story
        </Link>
      </div>

      {/* Bundle marketplace section */}
      <BundlesSection />

      {/* Search */}
      <div className="relative mb-5">
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <SearchIcon />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stories, authors..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
      </div>

      {/* Niche chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {NICHES.map((n) => (
          <button
            key={n}
            onClick={() => setNiche(n)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
              niche === n
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-white text-gray-600 border-border hover:border-primary hover:text-primary"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-400 mb-4">
        {filtered.length} {filtered.length === 1 ? "story" : "stories"} found
      </p>

      {/* Story grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-gray-500 text-sm">No stories match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((s) => (
            <StoryCard key={s.id} story={s} />
          ))}
        </div>
      )}
    </div>
  );
}
