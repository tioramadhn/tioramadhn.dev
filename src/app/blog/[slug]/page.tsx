import clsx from 'clsx';
import { notFound } from 'next/navigation';

import { Markdown } from '@/components/markdown';
import { ButtonLink, Chip, Container } from '@/components/ui';

import { formatDate } from '@/lib/markdown';
import { getPost } from '@/lib/posts';
import { absoluteUrl } from '@/lib/site';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post || post.status !== 'published') {
    return { title: 'Post not found' };
  }

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      url: absoluteUrl(`/blog/${post.slug}`),
      publishedTime: post.date,
      tags: post.tags,
      images: [post.cover ?? '/assets/images/og-image.png'],
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  // Drafts are only reachable from the admin preview, never from a public URL.
  if (!post || post.status !== 'published') {
    notFound();
  }

  return (
    <Container className={clsx('py-14', 'md:py-20')}>
      <article>
        <header className={clsx('border-ink mb-10 border-b-[3px] pb-8')}>
          <div className={clsx('mb-5 flex flex-wrap items-center gap-2')}>
            <Chip className={clsx('bg-cyan text-[#11100f]')}>
              {formatDate(post.date)}
            </Chip>
            <Chip className={clsx('text-ink-soft border-dashed')}>
              {post.readingTime} min read
            </Chip>
          </div>

          <h1
            className={clsx(
              'display-text text-4xl break-words',
              'sm:text-5xl md:text-6xl'
            )}
          >
            {post.title}
          </h1>

          {post.description ? (
            <p className={clsx('text-ink-soft mt-5 max-w-2xl text-lg')}>
              {post.description}
            </p>
          ) : null}

          {post.tags.length > 0 ? (
            <ul className={clsx('mt-6 flex flex-wrap gap-2')}>
              {post.tags.map((tag) => (
                <li key={tag}>
                  <Chip className={clsx('bg-paper-raised')}>#{tag}</Chip>
                </li>
              ))}
            </ul>
          ) : null}
        </header>

        {post.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover}
            alt=""
            className={clsx(
              'border-ink shadow-brutal mb-10 w-full border-[3px]'
            )}
          />
        ) : null}

        <Markdown source={post.body} />
      </article>

      <div className={clsx('border-ink mt-16 border-t-[3px] pt-8')}>
        <ButtonLink href="/blog" tone="outline">
          ← All posts
        </ButtonLink>
      </div>
    </Container>
  );
}
