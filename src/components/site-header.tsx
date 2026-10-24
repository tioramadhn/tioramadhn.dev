'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { ThemeToggle } from '@/components/theme-toggle';
import { Container } from '@/components/ui';

import { nav, site } from '@/lib/site';

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={clsx('border-ink bg-paper sticky top-0 z-50 border-b-[3px]')}
    >
      <Container>
        <div className={clsx('flex h-16 items-center justify-between gap-4')}>
          <Link
            href="/"
            className={clsx('display-text text-xl', 'md:text-2xl')}
            onClick={() => setOpen(false)}
          >
            {site.handle}
            <span className={clsx('text-brand')}>.</span>
          </Link>

          <nav className={clsx('hidden items-center gap-1', 'lg:flex')}>
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'border-[3px] px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.08em] uppercase',
                  isActive(item.href)
                    ? 'border-ink bg-ink text-paper'
                    : 'hover:bg-lime hover:border-ink border-transparent hover:text-[#11100f]'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className={clsx('flex items-center gap-2')}>
            <ThemeToggle />
            <button
              type="button"
              aria-label="Toggle navigation"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className={clsx(
                'border-ink bg-paper-raised shadow-brutal-sm flex h-10 w-10 items-center justify-center border-[3px]',
                'lg:hidden'
              )}
            >
              <span aria-hidden className={clsx('font-mono text-sm font-bold')}>
                {open ? '✕' : '☰'}
              </span>
            </button>
          </div>
        </div>
      </Container>

      {open ? (
        <div
          className={clsx(
            'border-ink bg-paper-raised border-t-[3px]',
            'lg:hidden'
          )}
        >
          <Container>
            <nav className={clsx('flex flex-col py-3')}>
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={clsx(
                    'border-ink border-b-2 py-3 font-mono text-xs font-bold tracking-[0.08em] uppercase last:border-b-0',
                    isActive(item.href) && 'text-brand'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
