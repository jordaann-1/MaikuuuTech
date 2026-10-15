import { NextResponse } from 'next/server';
import { adminSession } from '@/lib/auth';
import { HttpError, safeError } from '@/lib/http';
import { privateHeaders } from '@/lib/inquiry-admin';
export async function GET() {
  try {
    const session = await adminSession();
    if (!session) throw new HttpError(401, 'Administrator access is required.');
    const { data, error } = await session.supabase.rpc('inquiry_summary');
    if (error) throw new HttpError(503, 'Inquiry statistics could not be loaded.');
    return NextResponse.json(data, { headers: privateHeaders });
  } catch (error) {
    return safeError(error);
  }
}
