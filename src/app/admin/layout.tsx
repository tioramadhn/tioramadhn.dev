import clsx from 'clsx';
import Link from 'next/link';

import { Container } from '@/components/ui';

import { isAuthenticated } from '@/lib/auth';

import { logout } from './actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAuthenticated();

  return (
    <div className={clsx('py-10', 'md:py-14')}>
      <Container>
        <div
          className={clsx(
            'border-ink mb-10 flex flex-wrap items-center justify-between gap-4 border-b-[3px] pb-6'
          )}
        >
          <div className={clsx('flex items-baseline gap-3')}>
            <Link href="/admin" className={clsx('display-text text-2xl')}>
              Writing desk
            </Link>
            <span
              className={clsx(
                'text-ink-soft font-mono text-[11px] tracking-[0.08em] uppercase'
              )}
            >
              R2
            </span>
          </div>

          {authed ? (
            <form action={logout}>
              <button
                type="submit"
                className={clsx(
                  'border-ink bg-paper-raised shadow-brutal-sm panel-interactive border-[3px] px-4 py-2 font-mono text-[11px] font-bold tracking-[0.08em] uppercase'
                )}
              >
                Sign out
              </button>
            </form>
          ) : null}
        </div>

        {children}
      </Container>
    </div>
  );
}
