import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Proxy — enforces www + https canonical URL.
 *
 * Runs at the edge on EVERY request:
 *   1. Redirects non-www → www (301 permanent)
 *   2. Redirects http → https (301 permanent)
 *   3. Sets SEO headers (Content-Language, X-Robots-Tag)
 *   4. Serves IndexNow key verification
 */
export function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();
  const pathname = request.nextUrl.pathname;

  // Skip for localhost, preview deployments, and Vercel preview URLs
  if (
    hostname.includes('localhost') ||
    hostname.includes('vercel.app') ||
    hostname.includes('127.0.0.1')
  ) {
    return NextResponse.next();
  }

  // ═══ IndexNow key verification ═══
  // Bing/Yandex verify ownership by requesting this key file
  if (pathname === '/b8e4c2a1f3d7e9b0.txt') {
    return new NextResponse('b8e4c2a1f3d7e9b0', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // ═══ CRITICAL: Redirect non-www → www (permanent 301) ═══
  if (hostname === 'kolkatacabservice.com') {
    url.host = 'www.kolkatacabservice.com';
    url.protocol = 'https';
    return NextResponse.redirect(url, 301);
  }

  // ═══ Redirect HTTP → HTTPS (safety net) ═══
  if (url.protocol === 'http:') {
    url.protocol = 'https';
    return NextResponse.redirect(url, 301);
  }

  // Add SEO headers to all responses
  const response = NextResponse.next();
  response.headers.set('Content-Language', 'en-IN');
  response.headers.set('X-Robots-Tag', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');

  return response;
}

export const config = {
  // Run on all paths except static assets
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:webp|png|jpg|svg|ico|css|js|woff2|avif)).*)',
  ],
};
