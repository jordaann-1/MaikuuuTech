import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Edge middleware is intentional: OpenNext does not support Node.js proxy/middleware.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || url.includes('YOUR_PROJECT')) return response;
  const supabase = createServerClient(url, key, {
    cookieOptions: { secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/auth/:path*', '/auth/:path*'],
};
