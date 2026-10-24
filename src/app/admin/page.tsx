import clsx from 'clsx';
import Link from 'next/link';

import { Mascot } from '@/components/mascot';

import { requireAuth } from '@/lib/auth';
import { formatDate } from '@/lib/markdown';
import { listPosts } from '@/lib/posts';

import { PostRowActions } from './post-row-actions';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireAuth();

  const posts = await listPosts({ includeDrafts: true });
  const drafts = posts.filter((post) => post.status === 'draft').length;

  return (
    <div className={clsx('flex flex-col gap-8')}>
      <div
        className={clsx('flex flex-wrap items-center justify-between gap-4')}
      >
        <div className={clsx('flex items-center gap-2')}>
          <Mascot
            expression={posts.length === 0 ? 'sleeping' : 'monitoring'}
            size={64}
            className={clsx('-my-4')}
          />
          <p className={clsx('text-ink-soft font-mono text-xs uppercase')}>
            {posts.length} post{posts.length === 1 ? '' : 's'} · {drafts} draft
            {drafts === 1 ? '' : 's'}
          </p>
        </div>
        <Link
          href="/admin/new"
          className={clsx(
            'border-ink bg-ink text-paper shadow-brutal panel-interactive border-[3px] px-5 py-2.5 font-mono text-[11px] font-bold tracking-[0.08em] uppercase'
          )}
        >
          + New post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div
          className={clsx('panel flex flex-col items-center p-8 text-center')}
        >
          <Mascot expression="sleeping" size={200} />
          <p className={clsx('display-text mt-2 text-2xl')}>
            Nothing written yet
          </p>
          <p className={clsx('text-ink-soft mt-3 text-sm')}>
            Start the first post — it is stored as markdown in R2, not in the
            repo.
          </p>
        </div>
      ) : (
        <ul className={clsx('flex flex-col gap-4')}>
          {posts.map((post) => (
            <li
              key={post.slug}
              className={clsx(
                'panel flex flex-col gap-4 p-5',
                'md:flex-row md:items-center md:justify-between'
              )}
            >
              <div className={clsx('min-w-0')}>
                <div className={clsx('mb-2 flex flex-wrap items-center gap-2')}>
                  <span
                    className={clsx(
                      'label-chip',
                      post.status === 'published'
                        ? 'bg-lime text-[#11100f]'
                        : 'bg-amber text-[#11100f]'
                    )}
                  >
                    {post.status}
                  </span>
                  <span className={clsx('text-ink-soft font-mono text-[11px]')}>
                    {formatDate(post.date)} · {post.readingTime} min
                  </span>
                </div>

                <Link
                  href={`/admin/edit/${post.slug}`}
                  className={clsx(
                    'block truncate text-lg font-bold hover:underline'
                  )}
                >
                  {post.title}
                </Link>
                <p
                  className={clsx(
                    'text-ink-soft truncate font-mono text-[11px]'
                  )}
                >
                  /blog/{post.slug}
                </p>
              </div>

              <PostRowActions slug={post.slug} status={post.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
