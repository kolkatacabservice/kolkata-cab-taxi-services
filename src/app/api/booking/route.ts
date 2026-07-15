import { NextRequest, NextResponse } from 'next/server';

// Run on the Edge runtime (Cloudflare Workers compatible)
export const runtime = 'edge';

const BUSINESS_PHONE = '+91 98315 07867';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tripType, from, to, date, carType, name, phone } = body;

    // Validate required fields
    if (!from || !date || !name || !phone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate phone number (min 10 digits)
    const cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    const GOOGLE_SCRIPT_URL = (process.env.GOOGLE_SCRIPT_URL || '').replace(/[\r\n]/g, '').trim();

    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_DEPLOYMENT_ID')) {
      console.error('GOOGLE_SCRIPT_URL env variable is not set or is still a placeholder!');
      return NextResponse.json(
        { success: false, error: 'Booking service not configured. Please call us directly.' },
        { status: 500 }
      );
    }

    const bookingPayload = {
      tripType: tripType || 'One-Way',
      pickupCity: from,
      dropCity: to || 'N/A',
      travelDate: date,
      carType: carType || 'Sedan',
      name,
      phone,
      timestamp: new Date().toISOString(),
      source: 'website',
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
        redirect: 'follow',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const resText = await response.text().catch(() => '');
        try {
          const resJson = JSON.parse(resText);
          if (resJson && resJson.success === false) {
            return NextResponse.json(
              { success: false, error: resJson.error || 'Booking submission failed. Please call us directly.' },
              { status: 502 }
            );
          }
        } catch { /* non-JSON response = OK */ }

        return NextResponse.json({
          success: true,
          message: 'Booking submitted successfully! We will call you shortly.',
        });
      } else {
        return NextResponse.json(
          { success: false, error: `Unable to submit booking (HTTP ${response.status}). Please call us directly.` },
          { status: 502 }
        );
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        return NextResponse.json(
          { success: false, error: `Request timed out. Please call us at ${BUSINESS_PHONE}.` },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Connection failed. Please call us directly.' },
        { status: 502 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}

// Return 405 for non-POST requests
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
