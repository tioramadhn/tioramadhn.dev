import clsx from 'clsx';
import Link from 'next/link';

import { Mascot } from '@/components/mascot';

import { requireAuth } from '@/lib/auth';
import { getPages } from '@/lib/content';

export const dynamic = 'force-dynamic';

function publicRoute(slug: string) {
  return slug === 'credits' ? '/credits' : `/work/${slug}`;
}

export default async function AdminPagesPage() {
  await requireAuth();
  const pages = await getPages();

  return (
    <div className={clsx('flex flex-col gap-6')}>
      <div className={clsx('flex items-center gap-3')}>
        <Mascot expression="writing" size={72} className={clsx('-my-4')} />
        <h1 className={clsx('display-text text-3xl')}>Pages</h1>
      </div>

      <ul className={clsx('flex flex-col gap-4')}>
        {pages.map((page) => (
          <li
            key={page.slug}
            className={clsx(
              'panel flex flex-col gap-4 p-5',
              'md:flex-row md:items-center md:justify-between'
            )}
          >
            <div className={clsx('min-w-0')}>
              <Link
                href={`/admin/pages/${page.slug}`}
                className={clsx(
                  'block truncate text-lg font-bold hover:underline'
                )}
              >
                {page.title}
              </Link>
              <p
                className={clsx('text-ink-soft truncate font-mono text-[11px]')}
              >
                {publicRoute(page.slug)}
              </p>
            </div>

            <div className={clsx('flex shrink-0 gap-2')}>
              <Link
                href={`/admin/pages/${page.slug}`}
                className={clsx(
                  'border-ink bg-paper-raised hover:bg-lime border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase hover:text-[#11100f]'
                )}
              >
                Edit
              </Link>
              <a
                href={publicRoute(page.slug)}
                target="_blank"
                rel="noreferrer"
                className={clsx(
                  'border-ink bg-paper-raised hover:bg-lime border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase hover:text-[#11100f]'
                )}
              >
                View ↗
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
