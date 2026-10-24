import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * Intentionally bare: every static page is prerendered into `.open-next/assets`
 * at build time, and the blog reads R2 on each request, so there is no ISR work
 * to delegate to a cache/queue/tag-cache override.
 *
 * If you ever add `export const revalidate = N` to a route, come back here and
 * wire up `incrementalCache` + `queue` (and `tagCache` for revalidatePath):
 * https://opennext.js.org/cloudflare/caching
 */
export default defineCloudflareConfig({});
