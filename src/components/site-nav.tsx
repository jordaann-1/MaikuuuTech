'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { BrandMark } from './brand';
import { ThemeToggle } from './theme-toggle';
export function SiteNav({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  const links = [
    ['/', 'Home'],
    ['/projects', 'Projects'],
    ['/about', 'About'],
    ['/skills', 'Skills'],
  ];
  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link href="/" className="brand" aria-label={name + ' home'}>
          <BrandMark />
          <span>
            {name}
            <span className="brand-dot">.</span>
          </span>
        </Link>
        <div className="nav-tools">
          <ThemeToggle />
          <button
            ref={toggle}
            className="icon-button mobile-toggle"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-expanded={open}
            aria-controls="main-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
        <nav
          id="main-navigation"
          aria-label="Main navigation"
          className={open ? 'main-nav open' : 'main-nav'}
        >
          {links.map(([url, label]) => (
            <Link
              key={url}
              href={url}
              onClick={() => setOpen(false)}
              aria-current={
                pathname === url || (url !== '/' && pathname.startsWith(url)) ? 'page' : undefined
              }
            >
              {label}
            </Link>
          ))}
          <Link href="/contact" onClick={() => setOpen(false)} className="nav-contact">
            Let’s talk <ArrowUpRight size={16} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
