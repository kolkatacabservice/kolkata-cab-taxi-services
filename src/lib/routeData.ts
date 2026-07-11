import 'server-only';
import fs from 'fs';
import path from 'path';
import { Route } from './data';

// Lazy load routes.json via fs to prevent webpack/turbopack from bundling the 5MB file
let cachedRoutes: Route[] | null = null;
let cachedRouteMap: Map<string, Route> | null = null;

function loadRoutesOnce(): { routes: Route[]; routeMap: Map<string, Route> } {
  if (!cachedRoutes || !cachedRouteMap) {
    const filePath = path.join(process.cwd(), 'src/data/routes.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    cachedRoutes = JSON.parse(fileContent) as Route[];
    cachedRouteMap = new Map<string, Route>(cachedRoutes.map(r => [r.slug, r]));
  }
  return { routes: cachedRoutes, routeMap: cachedRouteMap };
}

const routes = new Proxy([] as Route[], {
  get(_target, prop) {
    const rList = loadRoutesOnce().routes;
    const value = Reflect.get(rList, prop, rList);
    if (typeof value === 'function') {
      return value.bind(rList);
    }
    return value;
  }
});

const routeMap = new Proxy(new Map<string, Route>(), {
  get(_target, prop) {
    const rMap = loadRoutesOnce().routeMap;
    const value = Reflect.get(rMap, prop, rMap);
    if (typeof value === 'function') {
      return value.bind(rMap);
    }
    return value;
  }
});

export function getAllRoutes(): Route[] {
  return routes;
}

export function getRoute(slug: string): Route | undefined {
  return routeMap.get(slug);
}

export function getRoutesFrom(citySlug: string): Route[] {
  return routes.filter(r => r.from === citySlug);
}

export function getRoutesTo(citySlug: string): Route[] {
  return routes.filter(r => r.to === citySlug);
}

export function getRoutesBetweenStates(fromState: string, toState: string): Route[] {
  return routes.filter(r => r.fromState === fromState && r.toState === toState);
}

export function getPopularRoutes(limit: number = 12): Route[] {
  const hubSlugs = ['kolkata', 'ranchi', 'bhubaneswar'];
  const popularDestinations = [
    'darjeeling', 'puri', 'digha', 'deoghar', 'konark', 'ranchi',
    'bhubaneswar', 'kolkata', 'jamshedpur', 'mandarmani', 'gangasagar',
    'mayapur', 'siliguri', 'durgapur', 'asansol', 'dhanbad', 'bokaro',
  ];
  const popular = routes.filter(r => 
    hubSlugs.includes(r.from) && popularDestinations.includes(r.to)
  );
  return popular.slice(0, limit);
}

export function getLocalRoutes(citySlug: string, maxDistance: number = 200): Route[] {
  return routes
    .filter(r => r.from === citySlug && r.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);
}

export function getPopularLocalRoutes(citySlug: string, limit: number = 8): Route[] {
  const localRoutes = routes
    .filter(r => r.from === citySlug && r.distance <= 250 && r.distance > 0)
    .sort((a, b) => a.distance - b.distance);
  return localRoutes.slice(0, limit);
}

export function getAllRouteSlugs(): string[] {
  return routes.map(r => r.slug);
}

export function getHighPriorityRoutes(): Route[] {
  const hubSlugs = new Set(['kolkata', 'ranchi', 'bhubaneswar', 'jamshedpur', 'patna']);
  return routes.filter(r =>
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
  for (const route of routes) {
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
 * Returns at most `limit` route slugs for SSG, prioritised by:
 * 1. Hub → hub (e.g. kolkata ↔ ranchi)
 * 2. Hub → any destination, shortest routes first
 * 3. Reverse of any included route (if it exists)
 *
 * Hard cap prevents Vercel ENOSPC on the build container.
 */
export function getStaticRouteSlugs(limit: number = 800): string[] {
  const hubSlugs = new Set(['kolkata', 'ranchi', 'bhubaneswar', 'jamshedpur', 'patna']);

  // Tier 1: hub → hub
  const tier1 = routes.filter(r => hubSlugs.has(r.from) && hubSlugs.has(r.to));
  // Tier 2: hub → anywhere, sorted by distance ascending
  const tier2 = routes
    .filter(r => hubSlugs.has(r.from) && !hubSlugs.has(r.to))
    .sort((a, b) => a.distance - b.distance);
  // Tier 3: anywhere → hub, sorted by distance ascending
  const tier3 = routes
    .filter(r => !hubSlugs.has(r.from) && hubSlugs.has(r.to))
    .sort((a, b) => a.distance - b.distance);

  const seen = new Set<string>();
  const result: string[] = [];

  for (const r of [...tier1, ...tier2, ...tier3]) {
    if (result.length >= limit) break;
    if (!seen.has(r.slug)) {
      seen.add(r.slug);
      result.push(r.slug);
    }
  }

  // Fill remaining slots with reverse routes
  const withReverse = [...result];
  for (const slug of result) {
    if (withReverse.length >= limit) break;
    const parts = slug.split('-to-');
    if (parts.length === 2) {
      const rev = `${parts[1]}-to-${parts[0]}`;
      if (routeMap.has(rev) && !seen.has(rev)) {
        seen.add(rev);
        withReverse.push(rev);
      }
    }
  }

  return withReverse.slice(0, limit);
}

/**
 * Returns at most `limit` route slugs for vehicle-specific SSG pages.
 * Stricter than getStaticRouteSlugs — only hub↔hub and hub→short routes.
 */
export function getStaticVehicleRouteSlugs(limit: number = 150): string[] {
  return getStaticRouteSlugs(limit).filter(isHubRoute);
}

