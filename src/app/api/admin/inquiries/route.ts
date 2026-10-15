import { NextResponse } from 'next/server';
import { adminSession } from '@/lib/auth';
import { HttpError, safeError } from '@/lib/http';
import { inquiryFiltersSchema } from '@/lib/inquiries';
import { queryInquiries } from '@/lib/inquiry-server';
import { privateHeaders } from '@/lib/inquiry-admin';
export async function GET(request: Request) {
  try {
    const session = await adminSession();
    if (!session) throw new HttpError(401, 'Administrator access is required.');
    const parsed = inquiryFiltersSchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success) throw new HttpError(400, 'Check the inquiry filters and date range.');
    return NextResponse.json(await queryInquiries(session.supabase, parsed.data), {
      headers: privateHeaders,
    });
  } catch (error) {
    return safeError(error);
  }
}
