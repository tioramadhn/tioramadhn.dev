import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Secrets live on the Worker, so read them from the Cloudflare binding first
 * and only fall back to `process.env` (which covers `next dev` before the
 * miniflare context exists, and plain Node tooling).
 */
export async function getSecret(
  name: 'ADMIN_PASSWORD' | 'AUTH_SECRET'
): Promise<string | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const value = env[name];
    if (value) return value;
  } catch {
    // No Cloudflare context (e.g. during `next build`); fall through.
  }

  return process.env[name];
}

export async function getBlogBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });

  if (!env.BLOG_BUCKET) {
    throw new Error(
      'Missing R2 binding BLOG_BUCKET. Create the bucket with `pnpm wrangler r2 bucket create tioramadhn-blog` and check wrangler.jsonc.'
    );
  }

  return env.BLOG_BUCKET;
}
