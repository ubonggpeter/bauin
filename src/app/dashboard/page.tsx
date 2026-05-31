"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { id: "ai-content", icon: "✍️", name: "AI Content" },
  { id: "data", icon: "📊", name: "Data Analyst" },
  { id: "developer", icon: "💻", name: "AI Developer" },
  { id: "marketer", icon: "📱", name: "Marketer" },
  { id: "tutor", icon: "🎓", name: "AI Tutor" },
  { id: "video", icon: "🎬", name: "Video Editor" },
  { id: "crypto", icon: "₿", name: "Crypto & DeFi" },
];

const ACTIVE_JOBS = [
  {
    id: 1,
    title: "Write 10 AI-generated blog posts",
    category: "AI Content",
    budget: "₦45,000",
    deadline: "3 days",
    applicants: 12,
    certified: true,
  },
  {
    id: 2,
    title: "Build ML model for sales forecasting",
    category: "AI Developer",
    budget: "₦180,000",
    deadline: "7 days",
    applicants: 5,
    certified: true,
  },
  {
    id: 3,
    title: "DeFi yield strategy analysis report",
    category: "Crypto & DeFi",
    budget: "₦95,000",
    deadline: "2 days",
    applicants: 8,
    certified: false,
  },
  {
    id: 4,
    title: "Create 5 short-form tutorial videos",
    category: "Video Editor",
    budget: "₦60,000",
    deadline: "5 days",
    applicants: 19,
    certified: true,
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
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

function VerifiedBadge() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-primary flex-shrink-0">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect viewers to their dedicated dashboard
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "VIEWER") {
      router.replace("/dashboard/viewer");
    }
  }, [status, session, router]);

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const referralCode = "BAUIN-USR7842";

  function copyRef() {
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const filteredJobs = ACTIVE_JOBS.filter((job) => {
    const matchesCat = !selectedCat || job.category.toLowerCase().includes(selectedCat.toLowerCase());
    const matchesSearch =
      !searchQuery ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* ── Greeting ── */}
      <div className="mb-6">
        <p className="text-sm text-gray-500">{getGreeting()},</p>
        <h1 className="text-2xl font-bold text-text-dark">Welcome back! 👋</h1>
      </div>

      {/* ── Hero / wallet card ── */}
      <div className="bg-primary rounded-2xl p-6 mb-6 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-24 w-32 h-32 bg-white/5 rounded-full translate-y-10" />

        <div className="relative">
          <p className="text-primary-light text-sm mb-1">Total Earnings</p>
          <p className="text-gold text-4xl font-black mb-1">₦0.00</p>
          <p className="text-primary-light text-xs mb-6">+₦0 this month</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-primary-light text-[10px] leading-none mb-1">Wallet Balance</p>
              <p className="text-white font-bold text-sm">₦0.00</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-primary-light text-[10px] leading-none mb-1">Active Jobs</p>
              <p className="text-white font-bold text-sm">0</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-primary-light text-[10px] leading-none mb-1">Network</p>
              <p className="text-white font-bold text-sm">0</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-primary-light text-[10px] leading-none mb-1">Certifications</p>
              <p className="text-white font-bold text-sm">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="relative mb-6">
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <SearchIcon />
        </div>
        <input
          type="text"
          placeholder="Search jobs, categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
      </div>

      {/* ── Certified categories chips ── */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Certified Categories</p>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCat(null)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-colors ${
              !selectedCat
                ? "bg-primary text-white border-primary"
                : "bg-white text-gray-600 border-border hover:border-primary hover:text-primary"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(selectedCat === cat.name ? null : cat.name)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                selectedCat === cat.name
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-600 border-border hover:border-primary hover:text-primary"
              }`}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Active jobs ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-text-dark">Active Jobs</p>
          <span className="text-xs text-primary font-medium cursor-pointer hover:underline">View all</span>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-8 text-center">
            <p className="text-gray-400 text-sm">No jobs match your filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white border border-border rounded-2xl p-4 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-sm font-semibold text-text-dark leading-snug group-hover:text-primary transition-colors">
                    {job.title}
                  </p>
                  <span className="flex-shrink-0 bg-gold/10 text-gold text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap">
                    {job.budget}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1 text-xs bg-bg-light text-gray-600 px-2 py-1 rounded-full">
                    {job.certified && <VerifiedBadge />}
                    {job.category}
                  </span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-400">{job.deadline} left</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-400">{job.applicants} applied</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Referral mini-card ── */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-semibold text-text-dark">Refer &amp; Earn</p>
            <p className="text-xs text-gray-500 mt-0.5">Earn ₦2,500 for every verified referral</p>
          </div>
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-lg">🤝</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 bg-bg-light border border-border rounded-xl px-3 py-2.5 text-sm font-mono text-text-dark truncate">
            {referralCode}
          </div>
          <button
            onClick={copyRef}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              copied
                ? "bg-green-500 text-white"
                : "bg-primary text-white hover:bg-primary-dark"
            }`}
          >
            {copied ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <CopyIcon />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
