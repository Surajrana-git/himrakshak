import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // No Next.js badge in the corner of the phone app during demos.
  devIndicators: false,
  // The service worker must never be cached, or phones keep an old version.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
