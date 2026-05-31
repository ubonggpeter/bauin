import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostBySlug, BLOG_POSTS, type BlogPost } from "@/lib/blog-posts";
import { JsonLd } from "@/components/JsonLd";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://bauin.com";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: "Post Not Found" };

  const url = `${APP_URL}/blog/${post.slug}`;
  return {
    title:       post.title,
    description: post.description,
    keywords:    post.tags,
    alternates:  { canonical: url },
    openGraph: {
      type:        "article",
      url,
      title:       post.title,
      description: post.description,
      siteName:    "BAUIN",
      publishedTime: post.publishedAt,
      modifiedTime:  post.updatedAt ?? post.publishedAt,
      tags:          post.tags,
      images: [{ url: `${APP_URL}/icons/icon-512.png`, width: 512, height: 512, alt: "BAUIN" }],
    },
    twitter: {
      card:        "summary_large_image",
      title:       post.title,
      description: post.description,
      images:      [`${APP_URL}/icons/icon-512.png`],
    },
  };
}

function PostBody({ post }: { post: BlogPost }) {
  return (
    <div className="prose-sm sm:prose max-w-none">
      {post.sections.map((section, si) => (
        <div key={si} className={si > 0 ? "mt-8" : ""}>
          {section.heading && (
            <h2 className="text-xl font-black text-text-dark mb-3 mt-0">
              {section.heading}
            </h2>
          )}
          {section.paragraphs?.map((p, pi) => (
            <p key={pi} className="text-gray-700 text-base leading-relaxed mb-4">
              {p}
            </p>
          ))}
          {section.list && (
            <ul className="space-y-2 mb-4 ml-1">
              {section.list.map((item, li) => (
                <li key={li} className="flex items-start gap-2.5 text-gray-700 text-sm">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  const url = `${APP_URL}/blog/${post.slug}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type":    "Article",
    "@id":      url,
    headline:   post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified:  post.updatedAt ?? post.publishedAt,
    keywords:   post.tags.join(", "),
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: {
      "@type": "Organization",
      name:    "BAUIN Editorial Team",
      url:     APP_URL,
    },
    publisher: {
      "@type": "Organization",
      name:    "BAUIN",
      logo: {
        "@type":  "ImageObject",
        url:      `${APP_URL}/icons/icon-512.png`,
        width:    512,
        height:   512,
      },
    },
    image: {
      "@type":  "ImageObject",
      url:      `${APP_URL}/icons/icon-512.png`,
      width:    512,
      height:   512,
    },
  };

  const relatedPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <div className="min-h-screen bg-bg-light">
        {/* ── Nav breadcrumb ── */}
        <div className="bg-white border-b border-border px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center gap-2 text-xs text-gray-500">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>›</span>
            <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
            <span>›</span>
            <span className="text-gray-700 font-medium truncate max-w-[200px]">{post.title}</span>
          </div>
        </div>

        {/* ── Header ── */}
        <div className="bg-white border-b border-border px-4 pt-10 pb-10">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-5">
              <span
                className="text-[11px] font-bold px-3 py-1 rounded-full text-white"
                style={{ background: "#1A6659" }}
              >
                {post.category}
              </span>
              <span className="text-xs text-gray-400">{post.readingTime} min read</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-text-dark leading-tight mb-4">
              {post.title}
            </h1>
            <p className="text-gray-500 text-base leading-relaxed mb-6">
              {post.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-400 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-[10px] font-black">
                  B
                </div>
                <span className="font-medium text-gray-600">BAUIN Editorial Team</span>
              </div>
              <span>·</span>
              <time dateTime={post.publishedAt}>{fmtDate(post.publishedAt)}</time>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-bg-light text-gray-500 border border-border"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-white rounded-2xl border border-border px-6 sm:px-10 py-10">
            <PostBody post={post} />

            {/* CTA inside article */}
            <div className="mt-12 rounded-2xl bg-primary p-6 text-white text-center">
              <p className="font-black text-lg mb-1">Ready to put this into action?</p>
              <p className="text-primary-light text-sm mb-5">
                Join BAUIN and start earning with AI tools, certified tasks, and a 50% referral programme.
              </p>
              <Link
                href="/auth/register"
                className="inline-block bg-gold text-text-dark font-black px-7 py-2.5 rounded-full text-sm hover:bg-yellow-400 transition-colors"
              >
                Register Free →
              </Link>
            </div>
          </div>

          {/* ── Related posts ── */}
          {relatedPosts.length > 0 && (
            <div className="mt-12">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-5">
                More from the blog
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {relatedPosts.map((rp) => (
                  <Link key={rp.slug} href={`/blog/${rp.slug}`} className="group block">
                    <div className="bg-white rounded-xl border border-border p-4 hover:shadow-sm hover:border-primary/30 transition-all h-full flex flex-col">
                      <p className="font-bold text-text-dark text-sm leading-snug mb-2 group-hover:text-primary transition-colors flex-1">
                        {rp.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-auto">{rp.readingTime} min read</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
