import { getBlogBucket } from '@/lib/env';

import {
  DEFAULT_PAGES,
  DEFAULT_PROJECTS,
  DEFAULT_SETTINGS,
} from '@/content/defaults';

import type {
  PageRecord,
  ProjectRecord,
  SiteSettings,
} from '@/lib/content-types';

const SETTINGS_KEY = 'site/settings.json';
const PROJECTS_KEY = 'site/projects.json';

/**
 * Site content is stored in the same R2 bucket as the blog, and every read
 * falls back to the built-in defaults in `@/content/defaults`. Nothing here
 * throws on a cold bucket: an unreachable or absent object just means the
 * visitor sees the default copy, which is the real site.
 */
async function readJson<T>(key: string): Promise<T | null> {
  try {
    const bucket = await getBlogBucket();
    const object = await bucket.get(key);
    if (!object) return null;
    return (await object.json()) as T;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  const bucket = await getBlogBucket();
  await bucket.put(key, JSON.stringify(value, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  });
}

export async function getSettings(): Promise<SiteSettings> {
  const stored = await readJson<Partial<SiteSettings>>(SETTINGS_KEY);
  if (!stored) return DEFAULT_SETTINGS;

  // Merge per section, so a settings file written by an older version of the
  // form still picks up any section added since.
  return {
    profile: { ...DEFAULT_SETTINGS.profile, ...stored.profile },
    hero: { ...DEFAULT_SETTINGS.hero, ...stored.hero },
    stack: stored.stack ?? DEFAULT_SETTINGS.stack,
    highlights: stored.highlights ?? DEFAULT_SETTINGS.highlights,
    socials: stored.socials ?? DEFAULT_SETTINGS.socials,
  };
}

export async function saveSettings(settings: SiteSettings): Promise<void> {
  await writeJson(SETTINGS_KEY, settings);
}

function sortProjects(projects: ProjectRecord[]): ProjectRecord[] {
  return [...projects]
    .map((project) => ({
      ...project,
      // Added after the first projects were saved; default it on read.
      coverFit: project.coverFit === 'contain' ? 'contain' : 'cover',
    }))
    .sort((a, b) => a.order - b.order) as ProjectRecord[];
}

export async function getProjects(): Promise<ProjectRecord[]> {
  const stored = await readJson<ProjectRecord[]>(PROJECTS_KEY);
  if (!stored || !Array.isArray(stored)) return sortProjects(DEFAULT_PROJECTS);
  return sortProjects(stored);
}

export async function getProject(
  slug: string
): Promise<ProjectRecord | undefined> {
  return (await getProjects()).find((project) => project.slug === slug);
}

export async function saveProjects(projects: ProjectRecord[]): Promise<void> {
  await writeJson(
    PROJECTS_KEY,
    projects.map((project, index) => ({ ...project, order: index }))
  );
}

export async function getPages(): Promise<PageRecord[]> {
  const stored = await readJson<PageRecord[]>('site/pages.json');
  if (!stored || !Array.isArray(stored)) return DEFAULT_PAGES;

  // Keep the default order and fill any gap from defaults.
  return DEFAULT_PAGES.map(
    (fallback) => stored.find((page) => page.slug === fallback.slug) ?? fallback
  );
}

export async function getPage(slug: string): Promise<PageRecord | undefined> {
  return (await getPages()).find((page) => page.slug === slug);
}

export async function savePages(pages: PageRecord[]): Promise<void> {
  await writeJson('site/pages.json', pages);
}
