import { listPosts } from '@/lib/posts';
import { absoluteUrl } from '@/lib/site';

import { projects } from '@/content/projects';

import type { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

const staticPaths = [
  '/',
  '/projects',
  '/blog',
  '/work/experience',
  '/work/skills-and-tools',
  '/work/contact',
  '/credits',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    ...staticPaths.map((path) => ({
      url: absoluteUrl(path),
      lastModified: new Date(),
      priority: path === '/' ? 1 : 0.7,
    })),
    ...projects.map((project) => ({
      url: absoluteUrl(`/projects/${project.slug}`),
      priority: 0.6,
    })),
  ];

  try {
    const posts = await listPosts();

    entries.push(
      ...posts.map((post) => ({
        url: absoluteUrl(`/blog/${post.slug}`),
        lastModified: new Date(post.updatedAt),
        priority: 0.8,
      }))
    );
  } catch {
    // Bucket unreachable: still serve the static part of the sitemap.
  }

  return entries;
}
