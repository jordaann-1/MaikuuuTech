import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';
import { adminSession } from '@/lib/auth';
import { isConfigured } from '@/lib/supabase/server';
import { BrandMark } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-toggle';
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ recovery?: string }>;
}) {
  if (await adminSession()) redirect('/admin');
  return (
    <main id="main" className="auth-page">
      <aside className="auth-aside">
        <Link href="/" className="brand">
          <BrandMark />
          <span>
            MaikuuuTech<span className="brand-dot">.</span>
          </span>
        </Link>
        <div>
          <div className="eyebrow">YOUR WORK. YOUR STORY.</div>
          <h1>
            Your work.
            <br />
            Your story.
            <br />
            <span className="accent">Your space.</span>
          </h1>
        </div>
        <p>Portfolio content management / Authorized access only</p>
      </aside>
      <div className="auth-main">
        <div className="auth-theme">
          <ThemeToggle />
        </div>
        <AuthForm
          configured={isConfigured()}
          expired={(await searchParams).recovery === 'expired'}
        />
      </div>
    </main>
  );
}
