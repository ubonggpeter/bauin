/**
 * Rewrites R2 public bucket URLs to the CDN origin.
 * Set CDN_URL to your Cloudflare CDN domain (e.g. https://cdn.bauin.app).
 * Falls back to the original URL when CDN_URL is unset.
 */
export function cdnUrl(url: string | null | undefined): string {
  if (!url) return "";
  const cdnBase = process.env.CDN_URL ?? process.env.NEXT_PUBLIC_CDN_URL;
  const r2Base = process.env.R2_PUBLIC_URL;
  if (!cdnBase || !r2Base || !url.startsWith(r2Base)) return url;
  return cdnBase + url.slice(r2Base.length);
}
