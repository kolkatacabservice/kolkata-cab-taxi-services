import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Ensure consistent URLs — no trailing slashes
  trailingSlash: false,

  // ── Performance: inline critical CSS to eliminate render-blocking chunk ──
  experimental: {
    optimizeCss: true,   // critters-based critical CSS extraction
    inlineCss: true,     // inlines above-the-fold CSS into <style> — removes the blocking <link>
  },

  images: {
    // ── Cloudflare Pages compatibility ───────────────────────────────────────
    // Cloudflare Pages does not support Next.js server-side image optimization.
    // Images are served as-is from the static build output.
    // Cloudflare's global CDN (free plan) auto-compresses images via Polish (paid)
    // or you can use Cloudflare Images ($5/mo) for optimization.
    // For now: unoptimized=true disables the Node.js optimizer — fully edge-compatible.
    unoptimized: true,
    // Keep format hints for future migration to Cloudflare Images
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
  // Matches browserslist in package.json (Chrome 92+, Safari 15.4+)
  compiler: {
    // Remove console.log in production for smaller bundles
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Robots-Tag', value: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://maps.googleapis.com https://maps.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://www.google-analytics.com https://www.analytics.google.com https://www.googletagmanager.com https://wa.me; frame-src https://www.google.com https://maps.google.com https://maps.googleapis.com https://www.googletagmanager.com;" },
          { key: 'Content-Language', value: 'en-IN' },
        ],
      },
      {
        source: '/(.*)\\.(js|css|woff2|webp|png|jpg|svg|ico)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/sitemap/:id.xml',
        headers: [
          // Now fully static — built at deploy time. Cache for 7 days, SWR 24h.
          // CDN will serve cached version; zero ISR Reads.
          { key: 'Cache-Control', value: 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400' },
          { key: 'Content-Type', value: 'application/xml' },
        ],
      },
      {
        source: '/sitemap_index.xml',
        headers: [
          // Fully static — cache for 7 days, SWR 24h
          { key: 'Cache-Control', value: 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400' },
          { key: 'Content-Type', value: 'application/xml' },
        ],
      },
      {
        source: '/robots.txt',
        headers: [
          // Fully static — cache for 24h at CDN, browsers recheck every 1h
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600' },
        ],
      },
      {
        source: '/feed.xml',
        headers: [
          // Fully static — cache for 24h
          { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600' },
          { key: 'Content-Type', value: 'application/rss+xml; charset=utf-8' },
        ],
      },

      // Noindex headers for stub/removed state paths (Delhi-NCR, Uttarakhand, MP)
      // Bihar and UP now have real pages — noindex removed.
      {
        source: '/delhi-ncr/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/uttarakhand/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/madhya-pradesh/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
  async redirects() {
    return [
      // ── Two-Way → Round-Trip consolidation (two-way pages removed) ─────────
      // All two-way service pages are consolidated into round-trip (same service)
      { source: '/services/two-way', destination: '/services/round-trip', permanent: true },
      { source: '/:state/:city/two-way', destination: '/:state/:city/round-trip', permanent: true },
      // Redirect /sitemap.xml → /sitemap_index.xml (Google compatibility fallback)
      {
        source: '/sitemap.xml',
        destination: '/sitemap_index.xml',
        permanent: true,
      },
      // Redirect /route/xxx to /routes/xxx (common typo)
      {
        source: '/route/:path*',
        destination: '/routes/:path*',
        permanent: true,
      },
      // Redirect /service/xxx to /services/xxx (common typo)
      {
        source: '/service/:path*',
        destination: '/services/:path*',
        permanent: true,
      },
      // ── Duplicate page consolidation — Salt Lake & New Town ─────────────
      // /west-bengal/salt-lake-kolkata and /west-bengal/new-town-kolkata are
      // duplicates of the richer /kolkata/salt-lake and /kolkata/new-town pages.
      // 301-redirect to consolidate all Google ranking signals to the canonical URL.
      { source: '/west-bengal/salt-lake-kolkata', destination: '/kolkata/salt-lake', permanent: true },
      { source: '/west-bengal/salt-lake-kolkata/:path*', destination: '/kolkata/salt-lake', permanent: true },
      { source: '/west-bengal/new-town-kolkata', destination: '/kolkata/new-town', permanent: true },
      { source: '/west-bengal/new-town-kolkata/:path*', destination: '/kolkata/new-town', permanent: true },
      // Bihar and UP now have real pages — redirects removed.
      // Delhi-NCR, Uttarakhand, MP remain redirected (no content yet)
      { source: '/delhi-ncr', destination: '/', permanent: true },
      { source: '/delhi-ncr/:path*', destination: '/', permanent: true },
      { source: '/uttarakhand', destination: '/', permanent: true },
      { source: '/uttarakhand/:path*', destination: '/', permanent: true },
      { source: '/madhya-pradesh', destination: '/', permanent: true },
      { source: '/madhya-pradesh/:path*', destination: '/', permanent: true },
    ];
  },
};

export default nextConfig;
