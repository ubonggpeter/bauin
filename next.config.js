import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Cloudflare R2 public bucket
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "pub-*.r2.dev" },
      // Custom CDN origin (set CDN_URL in env)
      ...(process.env.CDN_URL
        ? [{ protocol: "https", hostname: new URL(process.env.CDN_URL).hostname }]
        : []),
      // Dev
      { protocol: "http", hostname: "localhost" },
    ],
    loader: "default",
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
  webpack: (config) => {
    // react-pdf/pdfjs-dist optionally requires canvas in Node; disable in the browser bundle
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // Sentry org + project (set via env or .sentryclirc)
  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload source maps to Sentry; requires SENTRY_AUTH_TOKEN
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Suppress the Sentry CLI output during builds
  silent: !process.env.CI,

  // Automatically instrument server-side routes
  autoInstrumentServerFunctions: true,
  hideSourceMaps: true,

  // Disable telemetry
  telemetry: false,
});
