/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["localhost"],
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
