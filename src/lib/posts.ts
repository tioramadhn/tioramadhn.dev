import { getBlogBucket } from '@/lib/env';
import { readingTimeMinutes, slugify } from '@/lib/markdown';

export type PostStatus = 'draft' | 'published';

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  status: PostStatus;
  cover: string | null;
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
