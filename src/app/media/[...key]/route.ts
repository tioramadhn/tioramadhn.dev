import { getBlogBucket } from '@/lib/env';
import { MEDIA_PREFIX } from '@/lib/posts';

/**
 * Public read-through for uploaded images. Scoped to the `media/` prefix so a
 * crafted URL can never reach a post body (or anything else) in the bucket.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const objectKey = `${MEDIA_PREFIX}${key.join('/')}`;

  if (key.some((part) => part === '..' || part === '' || part.includes('\\'))) {
    return new Response('Bad request', { status: 400 });
  }

  const bucket = await getBlogBucket();
  const object = await bucket.get(objectKey);

  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  // Keys are content-addressed (random suffix), so they can be cached forever.
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
}
