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
