import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog-posts";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://bauin.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: APP_URL,                     lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${APP_URL}/auth/login`,     lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${APP_URL}/auth/register`,  lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${APP_URL}/blog`,           lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url:              `${APP_URL}/blog/${post.slug}`,
    lastModified:     new Date(post.updatedAt ?? post.publishedAt),
    changeFrequency:  "monthly",
    priority:         0.7,
  }));

  return [...staticRoutes, ...blogRoutes];
}
