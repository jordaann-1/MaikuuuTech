import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function isConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('YOUR_PROJECT'),
  );
}
export async function createClient() {
  if (!isConfigured()) throw new Error('SETUP_REQUIRED');
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
      cookieOptions: { secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' },
      cookies: {
        getAll: () => store.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            /* Middleware handles refresh in Server Components. */
          }
        },
      },
    },
  );
}
