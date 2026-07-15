// Vehicle-specific route pages removed.
// With output: 'export', redirect() requires server — use dynamicParams=false instead.
// Any /routes/xxx/vehicle URL returns 404 (pages were always just redirects, never indexed).
export const dynamicParams = false;

export async function generateStaticParams() {
  // Return empty array — no vehicle pages generated in static export
  return [];
}

export default function VehicleRouteRedirect() {
  return null;
}
