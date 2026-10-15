import { NextResponse } from 'next/server';
import { createClient, isConfigured } from '@/lib/supabase/server';
import { siteUrl } from '@/lib/data';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (isConfigured() && params.get('type') === 'recovery' && params.get('token_hash')) {
    const db = await createClient();
    const { error } = await db.auth.verifyOtp({
      type: 'recovery',
      token_hash: params.get('token_hash')!,
    });
    if (!error) return NextResponse.redirect(siteUrl('/admin/update-password'));
  }
  return NextResponse.redirect(siteUrl('/admin/login?recovery=expired'));
}
