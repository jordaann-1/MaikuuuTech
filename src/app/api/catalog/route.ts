import { NextResponse } from 'next/server';
import { published } from '@/lib/data';
import { isConfigured } from '@/lib/supabase/server';
export async function GET() {
  if (!isConfigured())
    return NextResponse.json(
      { services: [], budgets: [], configured: false },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  try {
    const [services, budgets] = await Promise.all([
      published('services'),
      published('inquiry_budget_ranges'),
    ]);
    return NextResponse.json(
      { services, budgets, configured: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { error: 'The service catalog is temporarily unavailable.' },
      { status: 503 },
    );
  }
}
