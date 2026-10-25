import clsx from 'clsx';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ButtonLink, Chip, Container, PageHeader } from '@/components/ui';

import { formatDate, formatTotalReadingTime } from '@/lib/markdown';
import { listPosts, seriesPosts } from '@/lib/posts';
import { absoluteUrl } from '@/lib/site';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface SeriesPageProps {
  params: Promise<{ slug: string }>;
}

/** A series exists only as long as a published post claims it. */
async function loadSeries(slug: string) {
  const items = seriesPosts(await listPosts(), slug);
  const [first] = items;

  return first?.series ? { series: first.series, items, first } : null;
}

export async function generateMetadata({
  params,
}: SeriesPageProps): Promise<Metadata> {
  const { slug } = await params;
  const found = await loadSeries(slug);

  if (!found) {
    return { title: 'Series not found' };
  }

  const { series, items } = found;
  const description = `${items.length} tulisan berurutan tentang ${series.title}.`;

  return {
    title: series.title,
    description,
    openGraph: {
      type: 'website',
      title: series.title,
      description,
      url: absoluteUrl(`/blog/series/${series.slug}`),
      images: [
        items.find((item) => item.cover)?.cover ??
          '/assets/images/og-image.png',
      ],
    },
  };
}

export default async function SeriesPage({ params }: SeriesPageProps) {
  const { slug } = await params;
  const found = await loadSeries(slug);

  if (!found) {
    notFound();
  }

  const { series, items, first } = found;
  const totalTime = items.reduce((sum, item) => sum + item.readingTime, 0);

  return (
    <Container className={clsx('py-14', 'md:py-20')}>
      <PageHeader
        caption="Seri"
        title={series.title}
        description={`${items.length} tulisan yang dirancang untuk dibaca berurutan, dari awal sampai selesai.`}
        mascot="focused"
      />

      <div className={clsx('mb-8 flex flex-wrap gap-2')}>
        <Chip className={clsx('bg-cyan text-[#11100f]')}>
          {items.length} materi
        </Chip>
        <Chip className={clsx('text-ink-soft border-dashed')}>
          {formatTotalReadingTime(totalTime)}
        </Chip>
      </div>

      <ol className={clsx('panel flex flex-col p-0')}>
        {items.map((item, index) => (
          <li
            key={item.slug}
            className={clsx('border-ink border-b-2 last:border-b-0')}
          >
            <Link
              href={`/blog/${item.slug}`}
              className={clsx(
                'hover:bg-lime flex flex-col gap-1 p-5 hover:text-[#11100f]',
                'sm:flex-row sm:items-baseline sm:gap-4'
              )}
            >
              <span className={clsx('shrink-0 font-mono text-xs font-bold')}>
                {String(index + 1).padStart(2, '0')}
              </span>

              <span className={clsx('min-w-0 flex-1')}>
                <span className={clsx('block font-bold break-words')}>
                  {item.title}
                </span>
                {item.description ? (
                  <span className={clsx('mt-1 block text-sm opacity-80')}>
                    {item.description}
                  </span>
                ) : null}
              </span>

              <span
                className={clsx('shrink-0 font-mono text-[11px] opacity-70')}
              >
                {formatDate(item.date)} · {item.readingTime}m
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <div className={clsx('mt-12 flex flex-wrap gap-3')}>
        <ButtonLink href={`/blog/${first.slug}`} tone="accent">
          Mulai dari awal →
        </ButtonLink>
        <ButtonLink href="/blog" tone="outline">
          ← Semua post
        </ButtonLink>
      </div>
    </Container>
  );
}
