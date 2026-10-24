import clsx from 'clsx';
import { notFound } from 'next/navigation';

import { ContentPage } from '@/components/content-page';
import { ButtonLink } from '@/components/ui';

import { getProject } from '@/lib/content';

import type { Metadata } from 'next';

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: 'Project not found' };

  return { title: project.title, description: project.summary };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  return (
    <ContentPage
      caption={project.caption}
      title={project.title}
      description={project.summary}
      mascot={project.mascot}
      body={project.body}
    >
      <div className={clsx('mb-10 flex flex-wrap gap-3')}>
        {project.siteUrl ? (
          <ButtonLink href={project.siteUrl} tone="accent" external>
            Visit site
          </ButtonLink>
        ) : null}
        <ButtonLink href="/projects" tone="outline">
          All projects
        </ButtonLink>
      </div>
    </ContentPage>
  );
}
