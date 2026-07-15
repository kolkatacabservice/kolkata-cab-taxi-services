import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // ── Static Export for Cloudflare Pages ────────────────────────────────────
  // output: 'export' produces a pure static `out/` directory.
  // No Vercel CLI or @cloudflare/next-on-pages needed — just `next build`.
  // Headers → public/_headers (Cloudflare Pages native)
  // Redirects → public/_redirects (Cloudflare Pages native)
  // API routes → functions/ (Cloudflare Pages Functions)
  output: 'export',

  // Ensure consistent URLs — no trailing slashes
  trailingSlash: false,

  // experimental flags disabled for CF Pages compatibility
  experimental: {
    // optimizeCss: true,   // disabled — critters not compatible with static export
    // inlineCss: true,     // disabled
  },

  images: {
    // Static export requires unoptimized images
    // Cloudflare's global CDN (Polish/Images) handles optimization
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [390, 640, 750, 1080, 1920],
    imageSizes: [16, 32, 64, 128, 256],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
  },
  compress: true,
  poweredByHeader: false,

  // ── Strip legacy JS polyfills — SWC targets modern browsers only ──
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // Headers and Redirects are handled by public/_headers and public/_redirects
  // Cloudflare Pages natively supports these files — zero server required.
};

export default nextConfig;
