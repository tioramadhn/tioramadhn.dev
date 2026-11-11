import { getBlogBucket } from '@/lib/env';
import { readingTimeMinutes, slugify } from '@/lib/markdown';

export type PostStatus = 'draft' | 'published';

/**
 * A series groups posts meant to be read in order — a course, a multi-part
 * write-up. Only the display title is stored; the slug is derived from it, so
 * there is one source of truth and renaming a series renames its URL with it.
 */
export interface PostSeries {
  slug: string;
  title: string;
}

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  status: PostStatus;
  cover: string | null;
  series: PostSeries | null;
  updatedAt: string;
  readingTime: number;
}

export interface Post extends PostMeta {
  body: string;
}

export interface PostInput {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  status: PostStatus;
  cover: string | null;
  /** Free text; empty means the post belongs to no series. */
  series: string;
  body: string;
}

const POST_PREFIX = 'posts/';
export const MEDIA_PREFIX = 'media/';

function postKey(slug: string) {
  return `${POST_PREFIX}${slug}.md`;
}

function slugFromKey(key: string) {
  return key.slice(POST_PREFIX.length).replace(/\.md$/, '');
}

/**
 * R2 custom metadata is a flat string map, so the post's fields are encoded as
 * strings there. That keeps the stored object a plain `.md` file (readable with
 * `wrangler r2 object get`) while still letting the index be built from a single
 * `list()` call, without fetching any bodies.
 */
function toCustomMetadata(input: PostInput): Record<string, string> {
  return {
    title: input.title,
    description: input.description,
    date: input.date,
    tags: input.tags.join(','),
    status: input.status,
    cover: input.cover ?? '',
    series: input.series.trim(),
    updatedAt: new Date().toISOString(),
    readingTime: String(readingTimeMinutes(input.body)),
  };
}

function fromCustomMetadata(
  slug: string,
  meta: Record<string, string> | undefined,
  uploaded: Date
): PostMeta {
  const raw = meta ?? {};
  const seriesTitle = raw.series?.trim() ?? '';

  return {
    slug,
    title: raw.title?.trim() || slug,
    description: raw.description ?? '',
    date: raw.date || uploaded.toISOString().slice(0, 10),
    tags: (raw.tags ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    status: raw.status === 'published' ? 'published' : 'draft',
    cover: raw.cover ? raw.cover : null,
    series: seriesTitle
      ? { slug: slugify(seriesTitle), title: seriesTitle }
      : null,
    updatedAt: raw.updatedAt || uploaded.toISOString(),
    readingTime: Number(raw.readingTime) > 0 ? Number(raw.readingTime) : 1,
  };
}

function byDateDesc(a: PostMeta, b: PostMeta) {
  return a.date === b.date
    ? b.updatedAt.localeCompare(a.updatedAt)
    : b.date.localeCompare(a.date);
}

export async function listPosts(
  options: { includeDrafts?: boolean } = {}
): Promise<PostMeta[]> {
  const bucket = await getBlogBucket();
  const posts: PostMeta[] = [];
  let cursor: string | undefined;

  do {
    const page = await bucket.list({
      prefix: POST_PREFIX,
      include: ['customMetadata'],
      limit: 500,
      cursor,
    });

    for (const object of page.objects) {
      if (!object.key.endsWith('.md')) continue;

      posts.push(
        fromCustomMetadata(
          slugFromKey(object.key),
          object.customMetadata,
          object.uploaded
        )
      );
    }

    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return posts
    .filter((post) => options.includeDrafts || post.status === 'published')
    .sort(byDateDesc);
}

export async function getPost(slug: string): Promise<Post | null> {
  const safeSlug = slugify(slug);
  if (!safeSlug) return null;

  const bucket = await getBlogBucket();
  const object = await bucket.get(postKey(safeSlug));
  if (!object) return null;

  const body = await object.text();
  const meta = fromCustomMetadata(
    safeSlug,
    object.customMetadata,
    object.uploaded
  );

  return { ...meta, body };
}

export async function savePost(input: PostInput): Promise<void> {
  const bucket = await getBlogBucket();

  await bucket.put(postKey(input.slug), input.body, {
    httpMetadata: { contentType: 'text/markdown; charset=utf-8' },
    customMetadata: toCustomMetadata(input),
  });
}

export async function deletePost(slug: string): Promise<void> {
  const bucket = await getBlogBucket();
  await bucket.delete(postKey(slug));
}

export async function postExists(slug: string): Promise<boolean> {
  const bucket = await getBlogBucket();
  return (await bucket.head(postKey(slug))) !== null;
}

export async function renamePost(from: string, to: string): Promise<void> {
  if (from === to) return;

  const bucket = await getBlogBucket();
  const existing = await bucket.get(postKey(from));
  if (!existing) return;

  await bucket.put(postKey(to), existing.body, {
    httpMetadata: existing.httpMetadata,
    customMetadata: existing.customMetadata,
  });
  await bucket.delete(postKey(from));
}

export function allTags(posts: PostMeta[]): string[] {
  return [...new Set(posts.flatMap((post) => post.tags))].sort();
}

/**
 * A series reads oldest-first — the order the posts were written to be read in,
 * which is the reverse of how the blog index lists them. Date is the only
 * ordering signal; `updatedAt` breaks ties so a same-day series stays stable.
 */
function byDateAsc(a: PostMeta, b: PostMeta) {
  return a.date === b.date
    ? a.updatedAt.localeCompare(b.updatedAt)
    : a.date.localeCompare(b.date);
}

export function seriesPosts(posts: PostMeta[], slug: string): PostMeta[] {
  return posts.filter((post) => post.series?.slug === slug).sort(byDateAsc);
}

export interface SeriesSummary extends PostSeries {
  count: number;
  readingTime: number;
}

/** Every series that has at least one post, for listings. */
export function allSeries(posts: PostMeta[]): SeriesSummary[] {
  const found = new Map<string, SeriesSummary>();

  for (const post of posts) {
    if (!post.series) continue;

    const existing = found.get(post.series.slug);

    if (existing) {
      existing.count += 1;
      existing.readingTime += post.readingTime;
    } else {
      found.set(post.series.slug, {
        ...post.series,
        count: 1,
        readingTime: post.readingTime,
      });
    }
  }

  return [...found.values()].sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * One folder in the admin list: a series with its instalments, or the posts
 * that belong to no series at all (`series: null`).
 */
export interface PostGroup {
  /** Stable key for UI state; a series slug, or `*none` for loose posts. */
  key: string;
  series: PostSeries | null;
  posts: PostMeta[];
  published: number;
  drafts: number;
  readingTime: number;
  /**
   * Dates carried by more than one instalment. Series order is read off the
   * date alone, so a shared date leaves the reading order arbitrary and able
   * to flip between deploys. Always empty for the loose group, which has no
   * reading order to get wrong.
   */
  clashingDates: string[];
}

export const LOOSE_GROUP_KEY = '*none';

function findClashingDates(posts: PostMeta[]): string[] {
  const seen = new Map<string, number>();

  for (const post of posts) {
    seen.set(post.date, (seen.get(post.date) ?? 0) + 1);
  }

  return [...seen.entries()]
    .filter(([, count]) => count > 1)
    .map(([date]) => date);
}

function toGroup(
  key: string,
  series: PostSeries | null,
  posts: PostMeta[]
): PostGroup {
  return {
    key,
    series,
    posts,
    published: posts.filter((post) => post.status === 'published').length,
    drafts: posts.filter((post) => post.status === 'draft').length,
    readingTime: posts.reduce((total, post) => total + post.readingTime, 0),
    clashingDates: series ? findClashingDates(posts) : [],
  };
}

/**
 * Folds a flat post list into per-series folders for the admin list. Inside a
 * folder the order is the reading order (date ascending), the same order the
 * series nav shows a reader, so a wrong position is visible here rather than
 * only on the live site. The folders themselves sort by their most recent
 * instalment, which floats whatever is being written now to the top, and the
 * loose posts come last keeping the newest-first order `listPosts` gave them.
 */
export function groupPostsBySeries(posts: PostMeta[]): PostGroup[] {
  // The series is kept beside its members rather than read back off
  // `items[0]`, so the group's own type never depends on an indexed lookup.
  const bySeries = new Map<string, { series: PostSeries; posts: PostMeta[] }>();
  const loose: PostMeta[] = [];

  for (const post of posts) {
    if (!post.series) {
      loose.push(post);
      continue;
    }

    const existing = bySeries.get(post.series.slug);
    if (existing) existing.posts.push(post);
    else bySeries.set(post.series.slug, { series: post.series, posts: [post] });
  }

  const latestDate = (group: PostGroup) => group.posts.at(-1)?.date ?? '';

  const groups = [...bySeries.entries()]
    .map(([slug, found]) =>
      toGroup(slug, found.series, [...found.posts].sort(byDateAsc))
    )
    .sort((a, b) => latestDate(b).localeCompare(latestDate(a)));

  return loose.length
    ? [...groups, toGroup(LOOSE_GROUP_KEY, null, loose)]
    : groups;
}

export interface SeriesContext {
  series: PostSeries;
  items: PostMeta[];
  /** Zero-based position of the current post within `items`. */
  index: number;
  previous: PostMeta | null;
  next: PostMeta | null;
}

/**
 * The series a post sits in, with its neighbours. Drafts are left out, so an
 * unpublished middle instalment never becomes a dead "next" link — the chain
 * closes over it instead.
 */
export async function getSeriesContext(
  post: PostMeta
): Promise<SeriesContext | null> {
  if (!post.series) return null;

  const items = seriesPosts(await listPosts(), post.series.slug);
  const index = items.findIndex((item) => item.slug === post.slug);

  if (index === -1) return null;

  return {
    series: post.series,
    items,
    index,
    previous: items[index - 1] ?? null,
    next: items[index + 1] ?? null,
  };
}
