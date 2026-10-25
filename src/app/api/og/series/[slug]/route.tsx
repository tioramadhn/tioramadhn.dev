import { formatTotalReadingTime } from '@/lib/markdown';
import { renderOgCard } from '@/lib/og-card';
import { allSeries, listPosts, seriesPosts } from '@/lib/posts';

export const dynamic = 'force-dynamic';

/** Social card for a series index — the link most worth sharing as a whole. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const posts = await listPosts();
  const series = allSeries(posts).find((item) => item.slug === slug);

  if (!series) {
    return new Response('Not found', { status: 404 });
  }

  const total = seriesPosts(posts, slug).reduce(
    (sum, post) => sum + post.readingTime,
    0
  );

  return renderOgCard({
    label: `Seri · ${series.count} materi`,
    title: series.title,
    note: formatTotalReadingTime(total),
  });
}
