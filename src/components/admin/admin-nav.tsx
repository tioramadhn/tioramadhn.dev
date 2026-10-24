'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/admin', label: 'Posts', exact: true },
  { href: '/admin/profile', label: 'Profile' },
  { href: '/admin/projects', label: 'Projects' },
  { href: '/admin/pages', label: 'Pages' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className={clsx('flex flex-wrap gap-1.5')}>
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href || pathname.startsWith('/admin/edit')
          : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              'border-[3px] px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.08em] uppercase',
              active
                ? 'border-ink bg-ink text-paper'
                : 'border-ink bg-paper-raised hover:bg-lime hover:text-[#11100f]'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
