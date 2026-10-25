import clsx from 'clsx';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Markdown } from '@/components/markdown';
import {
  SeriesSidebar,
  SeriesSteps,
  SeriesSummary,
} from '@/components/series-nav';
import { SeriesNavToggle } from '@/components/series-nav-toggle';
import { ButtonLink, Chip, Container } from '@/components/ui';

import { formatDate } from '@/lib/markdown';
import { getPost, getSeriesContext } from '@/lib/posts';
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
      images: [absoluteUrl(`/api/og/${post.slug}`)],
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

  const seriesContext = await getSeriesContext(post);

  return (
    <Container
      className={clsx('py-14', 'md:py-20', seriesContext && 'max-w-6xl')}
    >
      <div className={clsx(seriesContext && 'series-shell')}>
        {seriesContext ? <SeriesSidebar context={seriesContext} /> : null}

        <div className={clsx('min-w-0', seriesContext && 'series-main')}>
          {seriesContext ? <SeriesSummary context={seriesContext} /> : null}

          {seriesContext ? <SeriesNavToggle /> : null}

          <article>
            <header className={clsx('border-ink mb-10 border-b-[3px] pb-8')}>
              <div className={clsx('mb-5 flex flex-wrap items-center gap-2')}>
                <Chip className={clsx('bg-cyan text-[#11100f]')}>
                  {formatDate(post.date)}
                </Chip>
                <Chip className={clsx('text-ink-soft border-dashed')}>
                  {post.readingTime} min read
                </Chip>
                {seriesContext ? (
                  <Link
                    href={`/blog/series/${seriesContext.series.slug}`}
                    className={clsx('hover:underline')}
                  >
                    <Chip className={clsx('bg-lime text-[#11100f]')}>
                      {seriesContext.series.title} · {seriesContext.index + 1}/
                      {seriesContext.items.length}
                    </Chip>
                  </Link>
                ) : null}
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
                      <Link href={`/blog/tag/${tag}`}>
                        <Chip
                          className={clsx(
                            'bg-paper-raised hover:bg-lime hover:text-[#11100f]'
                          )}
                        >
                          #{tag}
                        </Chip>
                      </Link>
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

          {seriesContext ? <SeriesSteps context={seriesContext} /> : null}

          <div className={clsx('border-ink mt-16 border-t-[3px] pt-8')}>
            <ButtonLink href="/blog" tone="outline">
              ← All posts
            </ButtonLink>
          </div>
        </div>
      </div>
    </Container>
  );
}
