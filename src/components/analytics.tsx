import { headers } from 'next/headers';

import { getVar } from '@/lib/env';

/**
 * Cloudflare Web Analytics. Privacy-first and cookieless, so it needs no
 * consent banner. Renders nothing until `WEB_ANALYTICS_TOKEN` is set in
 * wrangler.jsonc, which keeps it out of local development entirely.
 *
 * `/admin` is excluded so the owner's own editing sessions do not show up as
 * traffic. The path comes from the adapter's `x-opennext-initial-url` header —
 * a server component has no `usePathname`, and this site has no middleware
 * (the adapter does not support it) to set one.
 */
export async function Analytics() {
  const token = await getVar('WEB_ANALYTICS_TOKEN');

  if (!token) return null;

  const initialUrl = (await headers()).get('x-opennext-initial-url');
  const path = initialUrl ? new URL(initialUrl).pathname : '';

  if (path.startsWith('/admin')) return null;

  return (
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token })}
    />
  );
}
