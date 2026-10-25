import clsx from 'clsx';
import Link from 'next/link';

import { Mascot } from '@/components/mascot';
import { PostCard } from '@/components/post-card';
import { Chip, Container, PageHeader } from '@/components/ui';

import { formatTotalReadingTime } from '@/lib/markdown';
import { allSeries, allTags, listPosts } from '@/lib/posts';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Notes on frontend engineering, design systems, and shipping software that other people depend on.',
};

// Posts live in R2 and are written from /admin, so the list is read per request
// and a publish shows up immediately — no build or revalidation step.
export const dynamic = 'force-dynamic';

const sectionLabelClass =
  'text-ink-soft font-mono text-[11px] font-bold tracking-[0.08em] uppercase';

export default async function BlogPage() {
  const posts = await listPosts();
  const series = allSeries(posts);

  // A series is listed once, as its own entry, so its instalments stay out of
  // the feed below — otherwise one course buries every standalone post. The
  // tag row follows the feed, not the whole archive, so it never advertises a
  // tag nothing visible carries.
  const standalone = posts.filter((post) => !post.series);
  const tags = allTags(standalone);

  return (
    <Container className={clsx('py-14', 'md:py-20')}>
      <PageHeader
        caption="Writing"
        title="Blog"
        description="Notes on frontend engineering, design systems, and shipping software other people depend on."
        mascot={posts.length === 0 ? 'sleeping' : 'writing'}
      />

      {series.length > 0 ? (
        <section className={clsx('mb-12')}>
          <h2 className={clsx(sectionLabelClass, 'mb-4')}>Baca berurutan</h2>
          <div className={clsx('grid gap-4', 'md:grid-cols-2')}>
            {series.map((item) => (
              <Link
                key={item.slug}
                href={`/blog/series/${item.slug}`}
                className={clsx(
                  'panel panel-interactive flex items-center justify-between gap-4 p-5'
                )}
              >
                <span className={clsx('min-w-0')}>
                  <span
                    className={clsx('display-text block text-xl break-words')}
                  >
                    {item.title}
                  </span>
                  <span
                    className={clsx(
                      'text-ink-soft mt-1 block font-mono text-[11px]'
                    )}
                  >
                    {item.count} materi ·{' '}
                    {formatTotalReadingTime(item.readingTime)}
                  </span>
                </span>
                <span className={clsx('shrink-0 text-2xl')} aria-hidden>
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {tags.length > 0 ? (
        <ul className={clsx('mb-10 flex flex-wrap gap-2')}>
          {tags.map((tag) => (
            <li key={tag}>
              <Chip className={clsx('bg-paper-raised')}>#{tag}</Chip>
            </li>
          ))}
        </ul>
      ) : null}

      {posts.length === 0 ? (
        <div
          className={clsx('panel flex flex-col items-center p-8 text-center')}
        >
          <Mascot expression="sleeping" size={200} />
          <p className={clsx('display-text mt-2 text-2xl')}>No posts yet</p>
          <p className={clsx('text-ink-soft mt-3 text-sm')}>
            The first one is being written. Check back soon.
          </p>
        </div>
      ) : null}

      {standalone.length > 0 ? (
        <section>
          {series.length > 0 ? (
            <h2 className={clsx(sectionLabelClass, 'mb-4')}>Tulisan lepas</h2>
          ) : null}
          <div className={clsx('flex flex-col gap-6')}>
            {standalone.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </section>
      ) : null}
    </Container>
  );
}
