import { isAuthenticated } from '@/lib/auth';
import { getBlogBucket } from '@/lib/env';
import { slugify } from '@/lib/markdown';
import { MEDIA_PREFIX } from '@/lib/posts';

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  // Documents, so the CV can be swapped from the profile form.
  'application/pdf': 'pdf',
};

/** Upload endpoint for the admin editor. Returns the public `/media/...` URL. */
export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }

  const extension = ALLOWED[file.type];

  if (!extension) {
    return Response.json(
      { error: `Unsupported file type: ${file.type || 'unknown'}` },
      { status: 415 }
    );
  }

  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: `File is larger than ${MAX_BYTES / 1024 / 1024}MB` },
      { status: 413 }
    );
  }

  const now = new Date();
  const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'image';
  const unique = crypto.randomUUID().slice(0, 8);
  const key = `${MEDIA_PREFIX}${now.getUTCFullYear()}/${String(
    now.getUTCMonth() + 1
  ).padStart(2, '0')}/${base}-${unique}.${extension}`;

  const bucket = await getBlogBucket();

  // R2 needs a known content length, and `File.stream()` has none — buffering
  // is fine here because uploads are capped at MAX_BYTES.
  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  return Response.json({
    url: `/${key}`,
    markdown:
      file.type === 'application/pdf'
        ? `[${base}](/${key})`
        : `![${base}](/${key})`,
  });
}
