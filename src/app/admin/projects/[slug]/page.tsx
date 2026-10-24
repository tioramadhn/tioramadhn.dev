import { notFound } from 'next/navigation';

import { requireAuth } from '@/lib/auth';
import { getProject } from '@/lib/content';

import { ProjectEditor } from './project-editor';

import type { ProjectRecord } from '@/lib/content-types';

export const dynamic = 'force-dynamic';

const BLANK: ProjectRecord = {
  slug: '',
  order: 0,
  title: '',
  caption: '',
  description: '',
  summary: '',
  accent: 'bg-brand',
  stack: [],
  siteUrl: '',
  cover: '',
  coverFit: 'cover',
  mascot: 'focused',
  body: '## Overview\n\n',
};

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAuth();

  const { slug } = await params;

  if (slug === 'new') {
    return <ProjectEditor initial={BLANK} isNew />;
  }

  const project = await getProject(slug);
  if (!project) notFound();

  return <ProjectEditor initial={project} />;
}
