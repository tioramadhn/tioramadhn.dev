import clsx from 'clsx';
import Link from 'next/link';

import { Chip } from '@/components/ui';

import { formatDate } from '@/lib/markdown';

import type { PostMeta } from '@/lib/posts';

export function PostCard({ post }: { post: PostMeta }) {
  return (
    <article className={clsx('panel panel-interactive')}>
      <Link href={`/blog/${post.slug}`} className={clsx('block p-6', 'md:p-8')}>
        <div className={clsx('mb-4 flex flex-wrap items-center gap-2')}>
          <Chip className={clsx('bg-cyan text-[#11100f]')}>
            {formatDate(post.date)}
          </Chip>
          <Chip className={clsx('text-ink-soft border-dashed')}>
            {post.readingTime} min read
          </Chip>
          {post.status === 'draft' ? (
            <Chip className={clsx('bg-coral text-[#11100f]')}>Draft</Chip>
          ) : null}
        </div>

        <h2 className={clsx('display-text text-2xl', 'md:text-3xl')}>
          {post.title}
        </h2>

        {post.description ? (
          <p className={clsx('text-ink-soft mt-3 text-base')}>
            {post.description}
          </p>
        ) : null}

        {post.tags.length > 0 ? (
          <ul className={clsx('mt-5 flex flex-wrap gap-2')}>
            {post.tags.map((tag) => (
              <li
                key={tag}
                className={clsx(
                  'text-ink-soft font-mono text-[11px] uppercase'
                )}
              >
                #{tag}
              </li>
            ))}
          </ul>
        ) : null}
      </Link>
    </article>
  );
}
