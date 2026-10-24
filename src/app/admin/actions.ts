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
  body: string;
  status: PostStatus;
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

  if ((isRename || !payload.originalSlug) && (await postExists(slug))) {
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
    status: payload.status,
    cover: payload.cover.trim() || null,
    body: payload.body,
  });

  revalidatePath('/admin');
  revalidatePath('/blog');
  revalidatePath(`/blog/${slug}`);
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

  await savePost({ ...post, status });

  revalidatePath('/admin');
  revalidatePath('/blog');
  revalidatePath(`/blog/${slug}`);

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
