import clsx from 'clsx';

import { Mascot } from '@/components/mascot';
import { PostCard } from '@/components/post-card';
import { Chip, Container, PageHeader } from '@/components/ui';

import { allTags, listPosts } from '@/lib/posts';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Notes on frontend engineering, design systems, and shipping software that other people depend on.',
};

// Posts live in R2 and are written from /admin, so the list is read per request
// and a publish shows up immediately — no build or revalidation step.
export const dynamic = 'force-dynamic';

export default async function BlogPage() {
  const posts = await listPosts();
  const tags = allTags(posts);

  return (
    <Container className={clsx('py-14', 'md:py-20')}>
      <PageHeader
        caption="Writing"
        title="Blog"
        description="Notes on frontend engineering, design systems, and shipping software other people depend on."
        mascot={posts.length === 0 ? 'sleeping' : 'writing'}
      />

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
      ) : (
        <div className={clsx('flex flex-col gap-6')}>
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </Container>
  );
}
