// Direct JSON import — works with both Node.js and Edge runtime.
// routes.json (4.84MB) is bundled by Turbopack and gzip-compressed for Cloudflare deployment.
// Turbopack compresses JSON ~80% → ~1MB in the deployed worker.
import { Route } from './data';
import routesData from '@/data/routes.json';

const allRoutes = routesData as unknown as Route[];
const routeMap = new Map<string, Route>(allRoutes.map(r => [r.slug, r]));

export function getAllRoutes(): Route[] {
  return allRoutes;
}

export function getRoute(slug: string): Route | undefined {
  return routeMap.get(slug);
}

export function getRoutesFrom(citySlug: string): Route[] {
  return allRoutes.filter(r => r.from === citySlug);
}

export function getRoutesTo(citySlug: string): Route[] {
  return allRoutes.filter(r => r.to === citySlug);
}

export function getRoutesBetweenStates(fromState: string, toState: string): Route[] {
  return allRoutes.filter(r => r.fromState === fromState && r.toState === toState);
}

export function getPopularRoutes(limit: number = 12): Route[] {
  const hubSlugs = ['kolkata', 'ranchi', 'bhubaneswar'];
  const popularDestinations = [
    'darjeeling', 'puri', 'digha', 'deoghar', 'konark', 'ranchi',
    'bhubaneswar', 'kolkata', 'jamshedpur', 'mandarmani', 'gangasagar',
    'mayapur', 'siliguri', 'durgapur', 'asansol', 'dhanbad', 'bokaro',
  ];
  const popular = allRoutes.filter(r =>
    hubSlugs.includes(r.from) && popularDestinations.includes(r.to)
  );
  return popular.slice(0, limit);
}

export function getLocalRoutes(citySlug: string, maxDistance: number = 200): Route[] {
  return allRoutes
    .filter(r => r.from === citySlug && r.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);
}

export function getPopularLocalRoutes(citySlug: string, limit: number = 8): Route[] {
  const localRoutes = allRoutes
    .filter(r => r.from === citySlug && r.distance <= 250 && r.distance > 0)
    .sort((a, b) => a.distance - b.distance);
  return localRoutes.slice(0, limit);
}

export function getAllRouteSlugs(): string[] {
  return allRoutes.map(r => r.slug);
}

export function getHighPriorityRoutes(): Route[] {
  const hubSlugs = new Set(['kolkata', 'ranchi', 'bhubaneswar', 'jamshedpur', 'patna']);
  return allRoutes.filter(r =>
    r.distance <= 250 ||
    hubSlugs.has(r.from) ||
    hubSlugs.has(r.to)
  );
}

export function getHighPriorityRouteSlugs(): string[] {
  return getHighPriorityRoutes().map(r => r.slug);
}

export function getLinkedRouteSlugs(): string[] {
  const seen = new Set<string>();
  getHighPriorityRoutes().forEach(r => seen.add(r.slug));

  const routesByCity = new Map<string, Route[]>();
  for (const route of allRoutes) {
    const list = routesByCity.get(route.from) ?? [];
    list.push(route);
    routesByCity.set(route.from, list);
  }

  for (const [, cityRoutes] of routesByCity) {
    cityRoutes.slice(0, 20).forEach(r => seen.add(r.slug));
    cityRoutes
      .filter(r => r.distance <= 250 && r.distance > 0)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 12)
      .forEach(r => seen.add(r.slug));
  }

  const finalSlugs = new Set<string>(seen);
  for (const slug of seen) {
    const parts = slug.split('-to-');
    if (parts.length === 2) {
      const reverseSlug = `${parts[1]}-to-${parts[0]}`;
      if (routeMap.has(reverseSlug)) {
        finalSlugs.add(reverseSlug);
      }
    }
  }

  return Array.from(finalSlugs);
}

export function isHubRoute(slug: string): boolean {
  const parts = slug.split('-to-');
  if (parts.length === 2) {
    const hubSlugs = new Set(['kolkata', 'ranchi', 'bhubaneswar', 'jamshedpur', 'patna']);
    return hubSlugs.has(parts[0]) || hubSlugs.has(parts[1]);
  }
  return false;
}

export function getLinkedVehicleRouteSlugs(): string[] {
  const linked = getLinkedRouteSlugs();
  return linked.filter(isHubRoute);
}

/**
 * Returns ALL route slugs for SSG (used for sitemap generation at build time).
 */
export function getStaticRouteSlugs(): string[] {
  return allRoutes.map(r => r.slug);
}

/** @deprecated Use getStaticRouteSlugs() instead. */
export function getStaticVehicleRouteSlugs(): string[] {
  return getLinkedVehicleRouteSlugs();
}
