import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, isConfigured } from '@/lib/supabase/server';
import { HttpError, readJson, safeError, sameOrigin } from '@/lib/http';
import { adminSession } from '@/lib/auth';

export async function POST(request: Request, ctx: { params: Promise<{ action: string }> }) {
  try {
    sameOrigin(request);
    if (!isConfigured())
      throw new HttpError(
        503,
        'Supabase is not configured yet. Follow the setup guide in README.md.',
      );
    const { action } = await ctx.params;
    const db = await createClient();
    if (action === 'logout') {
      const { error } = await db.auth.signOut();
      if (error) throw new HttpError(503, 'Sign out failed. Please try again.');
      return NextResponse.json({ ok: true });
    }
    if (action === 'login') {
      const body = z
        .object({ email: z.email().max(254), password: z.string().min(1).max(128) })
        .strict()
        .safeParse(await readJson(request, 4096));
      if (!body.success) throw new HttpError(400, 'Enter your email and password.');
      const { error } = await db.auth.signInWithPassword(body.data);
      if (error)
        throw new HttpError(401, 'Unable to sign in. Check your credentials or try again later.');
      const session = await adminSession();
      if (!session) {
        await db.auth.signOut();
        throw new HttpError(403, 'This account does not have administrator access.');
      }
      return NextResponse.json({ ok: true });
    }
    if (action === 'recover') {
      const body = z
        .object({ email: z.email().max(254) })
        .strict()
        .safeParse(await readJson(request, 4096));
      if (!body.success) throw new HttpError(400, 'Enter a valid email address.');
      await db.auth.resetPasswordForEmail(body.data.email, {
        redirectTo: new URL(
          '/auth/confirm',
          process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        ).toString(),
      });
      return NextResponse.json({ ok: true });
    }
    if (action === 'password') {
      const session = await adminSession();
      if (!session) throw new HttpError(401, 'Sign in through your recovery link first.');
      const body = z
        .object({ password: z.string().min(12).max(128) })
        .strict()
        .safeParse(await readJson(request, 4096));
      if (!body.success) throw new HttpError(400, 'Use a password of at least 12 characters.');
      const { error } = await db.auth.updateUser({ password: body.data.password });
      if (error)
        throw new HttpError(
          400,
          'Password update failed. Request a fresh recovery link or reauthenticate.',
        );
      await db.auth.signOut({ scope: 'global' });
      return NextResponse.json({ ok: true });
    }
    throw new HttpError(404, 'Action not found.');
  } catch (error) {
    return safeError(error);
  }
}
