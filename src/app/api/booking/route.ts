import { NextRequest, NextResponse } from 'next/server';
import { BUSINESS } from '@/lib/data';

// ── Cloudflare Pages compatibility ──────────────────────────────────────────
// Edge runtime uses V8 isolates (not Node.js). fetch() & Web APIs work fine.
export const runtime = 'edge';

// Google Apps Script Web App URL — deployed as "Anyone can access"
const GOOGLE_SCRIPT_URL = (process.env.GOOGLE_SCRIPT_URL || '').replace(/[\r\n]/g, '').trim();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { tripType, from, to, date, carType, name, phone } = body;
    if (!from || !date || !name || !phone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate phone number (min 10 digits)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    // Check env var configured
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_DEPLOYMENT_ID')) {
      console.error('🚨 GOOGLE_SCRIPT_URL env variable is not set or is still the default placeholder!');
      return NextResponse.json(
        { success: false, error: 'Booking service is not configured (missing URL). Please call us directly.' },
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

    // Send to Google Sheets via Apps Script
    try {
      const controller = new AbortController();
      // 25s timeout — accounts for Vercel cold start + Google Script latency
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
        redirect: 'follow', // Google Apps Script uses 302 redirect — must follow
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // ANY 200 response = success (Script returns JSON or HTML — both are OK)
        const resText = await response.text().catch(() => '');
        console.log('✅ Booking sent to Google Sheets. Status:', response.status, '| Response:', resText.substring(0, 200));
        
        // Check if the response is JSON and contains success: false
        try {
          const resJson = JSON.parse(resText);
          if (resJson && resJson.success === false) {
            console.error('❌ Google Script returned execution error:', resJson.error);
            return NextResponse.json(
              { success: false, error: `Booking submission failed: ${resJson.error || 'Please call us directly.'}` },
              { status: 502 }
            );
          }
        } catch {
          // If response is not valid JSON, treat 200 OK as success
        }

        return NextResponse.json({
          success: true,
          message: 'Booking submitted successfully! We will call you shortly.',
        });
      } else {
        const errText = await response.text().catch(() => 'unknown');
        console.error('❌ Google Script HTTP error:', response.status, errText.substring(0, 300));
        return NextResponse.json(
          { success: false, error: `Unable to submit booking (HTTP ${response.status}). Please call us directly.` },
          { status: 502 }
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('❌ Google Script timed out after 25s');
        return NextResponse.json(
          { success: false, error: `Request timed out. Please call us at ${BUSINESS.phone}.` },
          { status: 504 }
        );
      }
      console.error('❌ Google Script fetch error:', err);
      return NextResponse.json(
        { success: false, error: `Connection failed: ${err instanceof Error ? err.message : 'Unknown network error'}. Please call us directly.` },
        { status: 502 }
      );
    }

  } catch (error) {
    console.error('Booking API error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}
