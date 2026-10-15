'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useEffect, useRef, useState } from 'react';
import {
  Award,
  BookOpen,
  BriefcaseBusiness,
  ChevronRight,
  Code2,
  ExternalLink,
  FileText,
  FolderKanban,
  GraduationCap,
  ImageIcon,
  Layers3,
  LayoutDashboard,
  Link2,
  LogOut,
  Mail,
  Menu,
  Settings,
  Trophy,
  X,
} from 'lucide-react';
import { BrandMark } from './brand';
import { ThemeToggle } from './theme-toggle';
import { InquiryBadge } from './inquiry-polling';
const nav = [
  ['', 'Overview', LayoutDashboard],
  ['projects', 'Projects', FolderKanban],
  ['skills', 'Skills', Code2],
  ['skill-categories', 'Skill categories', Layers3],
  ['experience', 'Experience', BriefcaseBusiness],
  ['education', 'Education', GraduationCap],
  ['certificates', 'Certificates', Award],
  ['achievements', 'Achievements', Trophy],
  ['services', 'Services', BookOpen],
  ['service-categories', 'Service categories', Layers3],
  ['budget-ranges', 'Inquiry budgets', FileText],
  ['inquiries', 'Client Inquiries', BriefcaseBusiness],
  ['messages', 'Messages', Mail],
  ['resume', 'Resume', FileText],
  ['media', 'Media library', ImageIcon],
  ['social-links', 'Social links', Link2],
  ['settings', 'Site settings', Settings],
] as const;
export function AdminShell({ name, children }: { name: string; children: React.ReactNode }) {
  const pathname = usePathname(),
    router = useRouter();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const sidebar = useRef<HTMLElement>(null),
    toggle = useRef<HTMLButtonElement>(null);
  const parts = pathname.split('/').filter(Boolean).slice(1);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebar.current?.querySelector<HTMLButtonElement>('.sidebar-close')?.focus();
    function keyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') || [],
      ).filter((item) => item.getClientRects().length > 0);
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    window.addEventListener('keydown', keyboard);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', keyboard);
      previous?.focus();
    };
  }, [open]);
  async function logout() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Sign out failed. Please try again.');
      router.push('/admin/login');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign out failed.');
      setBusy(false);
    }
  }
  return (
    <div className="admin-app">
      {open && (
        <button
          className="admin-mobile-backdrop"
          aria-label="Dismiss sidebar"
          tabIndex={-1}
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        ref={sidebar}
        id="admin-sidebar"
        className={'admin-sidebar ' + (open ? 'open' : '')}
        role={open ? 'dialog' : undefined}
        aria-modal={open ? true : undefined}
        aria-label="Administration workspace"
      >
        <div className="sidebar-brand-row">
          <Link href="/admin" className="brand">
            <BrandMark />
            <span>
              MaikuuuTech<span className="brand-dot">.</span>
            </span>
          </Link>
          <button
            className="icon-button sidebar-close"
            aria-label="Close sidebar"
            onClick={() => setOpen(false)}
          >
            <X size={17} />
          </button>
        </div>
        <nav className="admin-nav" aria-label="Administration">
          {nav.map(([key, label, Icon], index) => (
            <Fragment key={key}>
              {index === 1 && <div className="admin-sidebar-label">PORTFOLIO CONTENT</div>}
              {key === 'messages' && <div className="admin-sidebar-label">MANAGE & CONFIGURE</div>}
              <Link
                href={'/admin' + (key ? '/' + key : '')}
                aria-current={parts[0] === key || (!key && parts.length === 0) ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                <Icon size={16} />
                {label}
                {key === 'inquiries' && <InquiryBadge />}
              </Link>
            </Fragment>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/" target="_blank">
            View portfolio
            <ExternalLink size={13} />
          </Link>
          <Link href="/admin/update-password">
            Change password
            <Settings size={13} />
          </Link>
          <div className="sidebar-footer-note">YOUR CONTENT. IN GOOD HANDS.</div>
        </div>
      </aside>
      <div className="admin-shell">
        <header className="admin-topbar">
          <div>
            <button
              ref={toggle}
              className="icon-button admin-mobile-toggle"
              aria-label={open ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={open}
              aria-controls="admin-sidebar"
              onClick={() => setOpen(!open)}
            >
              <Menu size={18} />
            </button>
            <nav aria-label="Breadcrumb" className="admin-breadcrumb">
              <Link href="/admin">Workspace</Link>
              {parts.map((part, index) => (
                <span key={part + index} className="admin-breadcrumb">
                  <ChevronRight size={11} />
                  {nav.find((item) => item[0] === part)?.[1] || (part === 'new' ? 'New' : 'Edit')}
                </span>
              ))}
            </nav>
          </div>
          <div className="admin-user">
            <ThemeToggle />
            <span className="admin-avatar" aria-hidden="true">
              {name.slice(0, 2).toUpperCase()}
            </span>
            <span>{name}</span>
            <button className="icon-button" onClick={logout} disabled={busy} aria-label="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </header>
        {error && (
          <p role="alert" className="alert error">
            {error}
          </p>
        )}
        <main id="main" className="admin-main">
          {children}
        </main>
      </div>
    </div>
  );
}
