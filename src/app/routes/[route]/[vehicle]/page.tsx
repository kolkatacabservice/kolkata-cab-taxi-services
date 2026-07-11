import { redirect } from 'next/navigation';

// Vehicle-specific route pages are removed.
// All traffic redirects to the main route page's booking form.
// dynamicParams = true so Next.js calls this function (and redirect fires)
// instead of returning 404. Redirects do NOT cause ISR cache writes.
export const dynamicParams = true;

export default async function VehicleRouteRedirect({ params }: { params: Promise<{ route: string }> }) {
  const { route } = await params;
  redirect(`/routes/${route}#booking-form`);
}
