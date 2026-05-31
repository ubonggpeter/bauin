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
    // Serve optimised images from CDN when available
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

export default nextConfig;
