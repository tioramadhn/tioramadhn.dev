'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  endSession,
  isAuthenticated,
  startSession,
  verifyPassword,
} from '@/lib/auth';
import { slugify, today } from '@/lib/markdown';
import {
  deletePost,
  getPost,
  listPosts,
  postExists,
  renamePost,
  savePost,
} from '@/lib/posts';

import type { PostStatus } from '@/lib/posts';

export interface ActionResult {
  error?: string;
}

/**
 * Every action re-checks the session: the Cloudflare adapter does not support
 * Node middleware, so there is no single choke point to rely on.
 */
async function assertAuthenticated() {
  if (!(await isAuthenticated())) {
    redirect('/admin/login');
  }
}

export async function login(
  _previous: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const password = String(formData.get('password') ?? '');

  if (!password) {
    return { error: 'Enter the admin password.' };
  }

  try {
    if (!(await verifyPassword(password))) {
      return { error: 'Wrong password.' };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Login failed.' };
  }

  await startSession();
  redirect('/admin');
}

export async function logout(): Promise<void> {
  await endSession();
  redirect('/admin/login');
}

/** A post joining or leaving a series changes that series' page and its siblings. */
function revalidateSeries(title: string | undefined): void {
  const slug = slugify(title ?? '');
  if (slug) revalidatePath(`/blog/series/${slug}`);
}

function parseTags(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(',')
        .map((tag) => slugify(tag))
        .filter(Boolean)
    ),
  ].slice(0, 6);
}

export interface SavePostPayload {
  /** Slug the post currently has in R2, empty for a new post. */
  originalSlug: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string;
  cover: string;
  /** Display title of the series this post belongs to; empty for none. */
  series: string;
  body: string;
  status: PostStatus;
  /**
   * Overwrite a post that already has this slug instead of refusing. Used by
   * the bulk importer's replace mode; the stored status wins over `status`, so
   * re-importing an edited draft never unpublishes what is already live.
   */
  replaceExisting?: boolean;
}

export async function savePostAction(
  payload: SavePostPayload
): Promise<ActionResult & { slug?: string }> {
  await assertAuthenticated();

  const title = payload.title.trim();

  if (!title) {
    return { error: 'A post needs a title.' };
  }

  const slug = slugify(payload.slug || title);

  if (!slug) {
    return { error: 'Could not derive a slug from that title.' };
  }

  if (!payload.body.trim()) {
    return { error: 'A post needs a body.' };
  }

  const isRename = !!payload.originalSlug && payload.originalSlug !== slug;
  const replacing = payload.replaceExisting ? await getPost(slug) : null;

  if (
    !replacing &&
    (isRename || !payload.originalSlug) &&
    (await postExists(slug))
  ) {
    return { error: `A post with the slug "${slug}" already exists.` };
  }

  if (isRename) {
    await renamePost(payload.originalSlug, slug);
  }

  await savePost({
    slug,
    title,
    description: payload.description.trim(),
    date: /^\d{4}-\d{2}-\d{2}$/.test(payload.date) ? payload.date : today(),
    tags: parseTags(payload.tags),
    status: replacing ? replacing.status : payload.status,
    cover: payload.cover.trim() || null,
    series: payload.series,
    body: payload.body,
  });

  revalidatePath('/admin');
  revalidatePath('/blog');
  revalidatePath(`/blog/${slug}`);
  revalidateSeries(payload.series);
  if (isRename) revalidatePath(`/blog/${payload.originalSlug}`);

  return { slug };
}

export async function setStatusAction(
  slug: string,
  status: PostStatus
): Promise<ActionResult> {
  await assertAuthenticated();

  const post = await getPost(slug);

  if (!post) {
    return { error: 'That post no longer exists.' };
  }

  await savePost({ ...post, status, series: post.series?.title ?? '' });

  revalidatePath('/admin');
  revalidatePath('/blog');
  revalidatePath(`/blog/${slug}`);
  revalidateSeries(post.series?.title);

  return {};
}

export async function deletePostAction(slug: string): Promise<ActionResult> {
  await assertAuthenticated();

  await deletePost(slug);

  revalidatePath('/admin');
  revalidatePath('/blog');
  revalidatePath(`/blog/${slug}`);

  return {};
}

/**
 * Bulk actions take a list of slugs straight from the admin list's checkboxes,
 * so every slug is re-derived and de-duplicated here. The cap is a stop on a
 * runaway request: a Worker has a subrequest budget, and each target costs a
 * read plus a write.
 */
const BULK_LIMIT = 200;

function cleanSlugs(slugs: string[]): string[] {
  return [...new Set(slugs.map((slug) => slugify(slug)).filter(Boolean))].slice(
    0,
    BULK_LIMIT
  );
}

export interface BulkResult extends ActionResult {
  /** Posts actually written. A post already in the target state is skipped. */
  changed: number;
}

/** Everything a batch touched, revalidated once instead of per post. */
function revalidateBatch(slugs: string[], seriesSlugs: Set<string>): void {
  revalidatePath('/admin');
  revalidatePath('/blog');

  for (const slug of slugs) {
    revalidatePath(`/blog/${slug}`);
  }

  for (const slug of seriesSlugs) {
    revalidatePath(`/blog/series/${slug}`);
  }
}

function missingNote(missing: number): string | undefined {
  if (!missing) return undefined;

  return missing === 1
    ? '1 selected post no longer exists and was skipped.'
    : `${missing} selected posts no longer exist and were skipped.`;
}

export async function bulkSetStatusAction(
  slugs: string[],
  status: PostStatus
): Promise<BulkResult> {
  await assertAuthenticated();

  const targets = cleanSlugs(slugs);

  if (!targets.length) {
    return { changed: 0, error: 'Nothing selected.' };
  }

  const touchedSeries = new Set<string>();
  let changed = 0;
  let missing = 0;

  for (const slug of targets) {
    const post = await getPost(slug);

    if (!post) {
      missing += 1;
      continue;
    }

    if (post.series) touchedSeries.add(post.series.slug);

    // Already in the target state: skip the write so a mixed selection does
    // not rewrite `updatedAt` on posts it did not actually change.
    if (post.status === status) continue;

    await savePost({ ...post, status, series: post.series?.title ?? '' });
    changed += 1;
  }

  revalidateBatch(targets, touchedSeries);

  return { changed, error: missingNote(missing) };
}

/**
 * Moves a batch into a series, or out of every series when `series` is empty.
 * This is the counterpart to the grouped admin list: fixing a mistyped series
 * name across twenty instalments is otherwise twenty trips to the editor.
 */
export async function bulkSetSeriesAction(
  slugs: string[],
  series: string
): Promise<BulkResult> {
  await assertAuthenticated();

  const targets = cleanSlugs(slugs);

  if (!targets.length) {
    return { changed: 0, error: 'Nothing selected.' };
  }

  const title = series.trim();

  if (title && !slugify(title)) {
    return { changed: 0, error: 'That series name has no usable characters.' };
  }

  const touchedSeries = new Set<string>();
  if (title) touchedSeries.add(slugify(title));

  let changed = 0;
  let missing = 0;

  for (const slug of targets) {
    const post = await getPost(slug);

    if (!post) {
      missing += 1;
      continue;
    }

    // The old series page loses an instalment, so it needs revalidating too.
    if (post.series) touchedSeries.add(post.series.slug);

    if ((post.series?.title ?? '') === title) continue;

    await savePost({ ...post, series: title });
    changed += 1;
  }

  revalidateBatch(targets, touchedSeries);

  return { changed, error: missingNote(missing) };
}

export async function bulkDeleteAction(slugs: string[]): Promise<BulkResult> {
  await assertAuthenticated();

  const targets = cleanSlugs(slugs);

  if (!targets.length) {
    return { changed: 0, error: 'Nothing selected.' };
  }

  // One index read tells us which series pages go stale. Reading each post
  // individually would double the request count for no extra information.
  const index = await listPosts({ includeDrafts: true });
  const seriesBySlug = new Map(
    index.map((post) => [post.slug, post.series?.slug ?? null])
  );

  const touchedSeries = new Set<string>();
  let changed = 0;
  let missing = 0;

  for (const slug of targets) {
    if (!seriesBySlug.has(slug)) {
      missing += 1;
      continue;
    }

    const seriesSlug = seriesBySlug.get(slug);
    if (seriesSlug) touchedSeries.add(seriesSlug);

    await deletePost(slug);
    changed += 1;
  }

  revalidateBatch(targets, touchedSeries);

  return { changed, error: missingNote(missing) };
}
