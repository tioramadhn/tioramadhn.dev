'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isAuthenticated } from '@/lib/auth';
import {
  getPages,
  getProjects,
  savePages,
  saveProjects,
  saveSettings,
} from '@/lib/content';
import { slugify } from '@/lib/markdown';

import type {
  PageRecord,
  ProjectRecord,
  SiteSettings,
} from '@/lib/content-types';

export interface ActionResult {
  error?: string;
}

async function assertAuthenticated() {
  if (!(await isAuthenticated())) {
    redirect('/admin/login');
  }
}

/** Everything a settings change can affect. */
function revalidateSiteWide() {
  revalidatePath('/', 'layout');
}

export async function saveSettingsAction(
  settings: SiteSettings
): Promise<ActionResult> {
  await assertAuthenticated();

  if (!settings.profile.name.trim()) {
    return { error: 'Name cannot be empty.' };
  }

  await saveSettings({
    ...settings,
    stack: settings.stack.map((item) => item.trim()).filter(Boolean),
    highlights: settings.highlights.filter((item) => item.title.trim()),
    socials: settings.socials.filter(
      (item) => item.label.trim() && item.href.trim()
    ),
  });

  revalidateSiteWide();
  return {};
}

export async function saveProjectAction(
  original: string,
  project: ProjectRecord
): Promise<ActionResult & { slug?: string }> {
  await assertAuthenticated();

  const title = project.title.trim();
  if (!title) return { error: 'A project needs a title.' };

  const slug = slugify(project.slug || title);
  if (!slug) return { error: 'Could not derive a slug from that title.' };

  const projects = await getProjects();
  const taken = projects.some(
    (item) => item.slug === slug && item.slug !== original
  );
  if (taken) return { error: `A project with the slug "${slug}" exists.` };

  const next = { ...project, title, slug };
  const index = projects.findIndex((item) => item.slug === original);

  if (index === -1) {
    projects.push({ ...next, order: projects.length });
  } else {
    projects[index] = { ...projects[index], ...next };
  }

  await saveProjects(projects);

  revalidatePath('/');
  revalidatePath('/projects');
  revalidatePath(`/projects/${slug}`);
  if (original && original !== slug) revalidatePath(`/projects/${original}`);
  revalidatePath('/admin/projects');

  return { slug };
}

export async function deleteProjectAction(slug: string): Promise<ActionResult> {
  await assertAuthenticated();

  const projects = await getProjects();
  await saveProjects(projects.filter((project) => project.slug !== slug));

  revalidatePath('/');
  revalidatePath('/projects');
  revalidatePath(`/projects/${slug}`);
  revalidatePath('/admin/projects');

  return {};
}

export async function moveProjectAction(
  slug: string,
  direction: -1 | 1
): Promise<ActionResult> {
  await assertAuthenticated();

  const projects = await getProjects();
  const index = projects.findIndex((project) => project.slug === slug);
  const target = index + direction;

  if (index === -1 || target < 0 || target >= projects.length) return {};

  const moved = projects[index]!;
  projects[index] = projects[target]!;
  projects[target] = moved;

  await saveProjects(projects);

  revalidatePath('/');
  revalidatePath('/projects');
  revalidatePath('/admin/projects');

  return {};
}

export async function savePageAction(page: PageRecord): Promise<ActionResult> {
  await assertAuthenticated();

  if (!page.title.trim()) return { error: 'A page needs a title.' };

  const pages = await getPages();
  const index = pages.findIndex((item) => item.slug === page.slug);
  if (index === -1) return { error: 'Unknown page.' };

  pages[index] = page;
  await savePages(pages);

  const route = page.slug === 'credits' ? '/credits' : `/work/${page.slug}`;
  revalidatePath(route);
  revalidatePath('/admin/pages');

  return {};
}
