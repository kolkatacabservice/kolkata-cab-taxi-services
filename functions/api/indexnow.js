/**
 * Cloudflare Pages Function — /api/indexnow
 * Pings Bing + Yandex IndexNow API to re-index important pages.
 */

const INDEXNOW_KEY = 'f63a562479e04845a7090b84784a9e52';
const DOMAIN = 'https://www.kolkatacabservice.com';

const PRIORITY_URLS = [
  '/', '/services', '/services/local-taxi', '/services/outstation',
  '/services/one-way', '/services/airport-transfer', '/services/round-trip',
  '/fleet', '/tours', '/fare-chart', '/blog', '/contact', '/about', '/faq',
  '/west-bengal', '/jharkhand', '/odisha',
  '/west-bengal/kolkata', '/jharkhand/ranchi', '/jharkhand/jamshedpur',
  '/odisha/bhubaneswar', '/west-bengal/siliguri', '/west-bengal/darjeeling',
  '/routes/kolkata-to-ranchi', '/routes/kolkata-to-jamshedpur',
  '/routes/kolkata-to-bhubaneswar', '/routes/kolkata-to-siliguri',
  '/routes/kolkata-to-puri', '/routes/kolkata-to-darjeeling',
].map(u => `${DOMAIN}${u}`);

export async function onRequestGet(context) {
  const { request, env } = context;
  const apiKey = env.INDEXNOW_API_KEY || INDEXNOW_KEY;

  // Auth check
  const authHeader = request.headers.get('x-api-key');
  if (authHeader !== apiKey) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = [];
  for (const engine of [
    'https://www.bing.com/indexnow',
    'https://yandex.com/indexnow',
  ]) {
    try {
      const r = await fetch(engine, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: 'www.kolkatacabservice.com', key: apiKey, urlList: PRIORITY_URLS }),
      });
      results.push({ engine, status: r.ok ? 'success' : `error-${r.status}` });
    } catch (e) {
      results.push({ engine, status: 'failed', error: String(e) });
    }
  }

  return Response.json({ submitted: PRIORITY_URLS.length, results });
}

export async function onRequestPost(context) {
  return onRequestGet(context);
}
