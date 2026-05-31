import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "@/lib/blog-posts";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://bauin.com";

export const metadata: Metadata = {
  title:       "Blog — BAUIN Earning Guides & Platform News",
  description: "Practical guides, earning strategies, and platform updates from the BAUIN team. Learn how to maximise your AI income in Nigeria.",
  alternates:  { canonical: `${APP_URL}/blog` },
  openGraph: {
    title:       "BAUIN Blog — AI Earning Guides for Nigeria",
    description: "How-to guides, strategies, and success stories from Africa's leading AI income network.",
    url:         `${APP_URL}/blog`,
    type:        "website",
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  "Income Guides":   "#1A6659",
  "Referrals":       "#0E4A3D",
  "Quiz & Games":    "#7C3AED",
  "Certification":   "#B45309",
  "Platform Reviews": "#0369A1",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function BlogPage() {
  const featured = BLOG_POSTS[0];
  const rest     = BLOG_POSTS.slice(1);

  return (
    <div className="min-h-screen bg-bg-light">
      {/* ── Header ── */}
      <div className="bg-primary text-white pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-primary-light text-xs font-bold uppercase tracking-widest mb-3">BAUIN Blog</p>
          <h1 className="text-3xl sm:text-4xl font-black mb-3 leading-tight">
            Earning Guides &amp; Platform News
          </h1>
          <p className="text-primary-light text-sm sm:text-base max-w-xl">
            Practical strategies for growing your income on Africa's #1 AI earning network.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* ── Featured post ── */}
        <Link href={`/blog/${featured.slug}`} className="block mb-12 group">
          <div className="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-shadow">
            <div className="px-8 py-10 sm:px-10">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="text-[11px] font-bold px-3 py-1 rounded-full text-white"
                  style={{ background: CATEGORY_COLORS[featured.category] ?? "#1A6659" }}
                >
                  {featured.category}
                </span>
                <span className="text-xs text-gray-400">Featured</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-text-dark leading-snug mb-3 group-hover:text-primary transition-colors">
                {featured.title}
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-5 max-w-2xl">
                {featured.description}
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span>{fmtDate(featured.publishedAt)}</span>
                <span>·</span>
                <span>{featured.readingTime} min read</span>
              </div>
            </div>
          </div>
        </Link>

        {/* ── Post grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {rest.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
              <div className="bg-white rounded-2xl border border-border p-6 h-full hover:shadow-md hover:border-primary/30 transition-all flex flex-col">
                <span
                  className="self-start text-[11px] font-bold px-2.5 py-1 rounded-full text-white mb-4"
                  style={{ background: CATEGORY_COLORS[post.category] ?? "#1A6659" }}
                >
                  {post.category}
                </span>
                <h2 className="font-black text-text-dark text-base leading-snug mb-2 group-hover:text-primary transition-colors flex-1">
                  {post.title}
                </h2>
                <p className="text-gray-500 text-xs leading-relaxed mb-4 line-clamp-2">
                  {post.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-auto">
                  <span>{fmtDate(post.publishedAt)}</span>
                  <span>·</span>
                  <span>{post.readingTime} min read</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ── CTA ── */}
        <div className="mt-16 bg-primary rounded-2xl p-8 text-center text-white">
          <h3 className="text-xl font-black mb-2">Ready to Start Earning?</h3>
          <p className="text-primary-light text-sm mb-6">
            Join 50,000+ Nigerians earning through BAUIN&apos;s AI income platform.
          </p>
          <Link
            href="/auth/register"
            className="inline-block bg-gold text-text-dark font-black px-8 py-3 rounded-full text-sm hover:bg-yellow-400 transition-colors"
          >
            Register Now — It&apos;s Free
          </Link>
        </div>
      </div>
    </div>
  );
}
