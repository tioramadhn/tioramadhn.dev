import clsx from 'clsx';
import Link from 'next/link';

import { BulkImport } from '@/components/admin/bulk-import';
import { Mascot } from '@/components/mascot';

import { requireAuth } from '@/lib/auth';
import { groupPostsBySeries, listPosts } from '@/lib/posts';

import { PostBrowser } from './post-browser';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireAuth();

  const posts = await listPosts({ includeDrafts: true });
  const drafts = posts.filter((post) => post.status === 'draft').length;
  const groups = groupPostsBySeries(posts);
  const series = groups.filter((group) => group.series).length;

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
            {drafts === 1 ? '' : 's'} · {series} series
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

      <BulkImport />

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
        <PostBrowser groups={groups} />
      )}
    </div>
  );
}
