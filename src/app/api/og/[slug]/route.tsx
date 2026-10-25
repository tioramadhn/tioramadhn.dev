import { renderOgCard } from '@/lib/og-card';
import { getPost, getSeriesContext } from '@/lib/posts';

export const dynamic = 'force-dynamic';

/**
 * Social card for a post. The title is read from R2 by slug rather than taken
 * from a query string, so the route cannot be used to render arbitrary text
 * under this site's branding.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post || post.status !== 'published') {
    return new Response('Not found', { status: 404 });
  }

  const series = await getSeriesContext(post);

  return renderOgCard({
    label: series
      ? `${series.series.title} · Bagian ${series.index + 1}/${series.items.length}`
      : (post.tags[0] ?? 'Tulisan'),
    title: post.title,
    note: `${post.readingTime} menit baca`,
  });
}
