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

/**
 * Static files from `public/`, read through the assets binding rather than
 * bundled into the Worker. That is how the OG renderer gets its display font
 * without the font counting against the Worker size limit.
 */
export async function readAsset(path: string): Promise<ArrayBuffer> {
  const { env } = await getCloudflareContext({ async: true });

  if (!env.ASSETS) {
    throw new Error('Missing ASSETS binding; check wrangler.jsonc.');
  }

  const response = await env.ASSETS.fetch(
    new URL(path, 'https://assets.local')
  );

  if (!response.ok) {
    throw new Error(`Asset ${path} not found (${response.status}).`);
  }

  return response.arrayBuffer();
}

/**
 * Public (non-secret) Worker vars. Returns undefined outside a Worker context,
 * which is what happens while `next build` prerenders the two static admin
 * pages — and those are exactly the pages that should carry no analytics.
 */
export async function getVar(
  name: 'WEB_ANALYTICS_TOKEN'
): Promise<string | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const value = env[name];
    if (value) return value;
  } catch {
    // No Cloudflare context; fall through.
  }

  return process.env[name] || undefined;
}
