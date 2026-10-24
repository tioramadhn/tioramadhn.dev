import createMDX from '@next/mdx';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'mdx'],
  images: {
    // Cover images are served from R2 through /media/*, already sized by the
    // uploader, so Next's optimizer would only add a hop.
    unoptimized: true,
  },
  async redirects() {
    return [
      { source: '/work', destination: '/work/experience', permanent: false },
      { source: '/today-i-learned', destination: '/blog', permanent: true },
      { source: '/docs/:path*', destination: '/', permanent: true },
    ];
  },
};

const withMDX = createMDX({
  options: {
    // Turbopack needs plugins referenced by name, not by imported function.
    remarkPlugins: ['remark-gfm'],
    rehypePlugins: ['rehype-slug'],
  },
});

export default withMDX(nextConfig);

// Gives `next dev` the same bindings (R2, secrets) the Worker gets in production.
void initOpenNextCloudflareForDev();
