import clsx from 'clsx';
import { notFound } from 'next/navigation';

import { PostCard } from '@/components/post-card';
import { ButtonLink, Container, PageHeader } from '@/components/ui';

import { slugify } from '@/lib/markdown';
import { listPosts } from '@/lib/posts';
import { absoluteUrl } from '@/lib/site';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

/**
 * Unlike `/blog`, this lists series instalments too: someone who clicked a tag
 * asked for everything carrying it, not for a curated front page.
 */
async function taggedPosts(tag: string) {
  const posts = await listPosts();
  return posts.filter((post) => post.tags.includes(tag));
}

export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const { tag } = await params;
  const slug = slugify(tag);
  const posts = await taggedPosts(slug);

  if (posts.length === 0) {
    return { title: 'Tag not found' };
  }

  const description = `${posts.length} tulisan bertanda #${slug}.`;

  return {
    title: `#${slug}`,
    description,
    openGraph: {
      type: 'website',
      title: `#${slug}`,
      description,
      url: absoluteUrl(`/blog/tag/${slug}`),
    },
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const slug = slugify(tag);
  const posts = await taggedPosts(slug);

  // A tag exists only as long as a published post carries it.
  if (posts.length === 0) {
    notFound();
  }

  return (
    <Container className={clsx('py-14', 'md:py-20')}>
      <PageHeader
        caption="Tag"
        title={`#${slug}`}
        description={`${posts.length} tulisan bertanda tag ini, terbaru lebih dulu.`}
        mascot="thinking"
      />

      <div className={clsx('flex flex-col gap-6')}>
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>

      <div className={clsx('mt-12')}>
        <ButtonLink href="/blog" tone="outline">
          ← Semua post
        </ButtonLink>
      </div>
    </Container>
  );
}
