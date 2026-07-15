import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // ── Cloudflare Workers via @opennextjs/cloudflare ────────────────────────
  // Build command: npm run build:cf  (opennextjs-cloudflare build)
  // Output dir:    .open-next/
  // worker.js  → Cloudflare Worker (handles SSR, API routes, proxy)
  // assets/    → Static files served via Workers Static Assets

  experimental: {
    // No experimental flags — keep build clean and predictable
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [390, 640, 750, 1080, 1920],
    imageSizes: [16, 32, 64, 128, 256],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
  },

  compress: true,
  poweredByHeader: false,

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          // SEO headers — moved from proxy.ts since Node.js Proxy can't set these via @opennextjs/cloudflare
          { key: 'Content-Language', value: 'en-IN' },
          { key: 'X-Robots-Tag', value: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' },
        ],
      },
      {
        source: '/sitemap/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, s-maxage=604800' }],
      },
      {
        source: '/robots.txt',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=86400' }],
      },
    ];
  },

  async redirects() {
    return [
      { source: '/services/two-way', destination: '/services/round-trip', permanent: true },
      { source: '/sitemap.xml', destination: '/sitemap_index.xml', permanent: true },
      { source: '/route/:slug', destination: '/routes/:slug', permanent: true },
      { source: '/service/:slug', destination: '/services/:slug', permanent: true },
      { source: '/west-bengal/salt-lake-kolkata', destination: '/kolkata/salt-lake', permanent: true },
      { source: '/west-bengal/new-town-kolkata', destination: '/kolkata/new-town', permanent: true },
      { source: '/delhi-ncr/:path*', destination: '/', permanent: true },
      { source: '/uttarakhand/:path*', destination: '/', permanent: true },
      { source: '/madhya-pradesh/:path*', destination: '/', permanent: true },
    ];
  },
};

export default nextConfig;
