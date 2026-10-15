import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { getSettings, published } from '@/lib/data';
import { str } from '@/lib/content';
import { SiteNav } from '@/components/site-nav';
import { BrandMark } from '@/components/brand';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, socials] = await Promise.all([getSettings(), published('social_links')]);
  const name = str(settings, 'developer_name');
  return (
    <>
      <SiteNav name={name} />
      <main id="main">{children}</main>
      <footer className="site-footer container">
        <div className="footer-top">
          <div className="footer-identity">
            <Link href="/" className="brand">
              <BrandMark />
              <span>
                {name}
                <span className="brand-dot">.</span>
              </span>
            </Link>
            <p>{str(settings, 'headline')}</p>
          </div>
          <nav className="footer-links" aria-label="Explore the portfolio">
            {[
              ['/projects', 'Projects'],
              ['/about', 'About'],
              ['/skills', 'Skills'],
              ['/experience', 'Experience'],
              ['/education', 'Education'],
              ['/certificates', 'Certificates'],
              ['/achievements', 'Achievements'],
              ['/services', 'Services'],
              ['/resume', 'Resume'],
              ['/contact', 'Contact'],
            ].map(([url, label]) => (
              <Link key={url} href={url}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} {name}.{' '}
            {str(settings, 'footer_text') || 'Built with intention.'}
          </p>
          <div className="social-links">
            {socials.map((s) => (
              <a href={str(s, 'url')} key={s.id} target="_blank" rel="noopener noreferrer">
                {str(s, 'label')}
                <ArrowUpRight size={13} />
              </a>
            ))}
            {str(settings, 'contact_email') && (
              <a href={'mailto:' + str(settings, 'contact_email')}>
                Email
                <ArrowUpRight size={13} />
              </a>
            )}
            <Link href="/admin/login">
              Admin
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
