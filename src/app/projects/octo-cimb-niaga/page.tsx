import clsx from 'clsx';

import { MdxPage } from '@/components/mdx-page';
import { ButtonLink } from '@/components/ui';

import { getProject } from '@/content/projects';

import Content, { meta } from './content.mdx';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
};

export default function Page() {
  const project = getProject(meta.slug ?? '');

  return (
    <MdxPage meta={meta} mascot="monitoring">
      {project?.siteUrl ? (
        <div className={clsx('mb-10 flex gap-3')}>
          <ButtonLink href={project.siteUrl} tone="accent" external>
            Visit site
          </ButtonLink>
          <ButtonLink href="/projects" tone="outline">
            All projects
          </ButtonLink>
        </div>
      ) : (
        <div className={clsx('mb-10')}>
          <ButtonLink href="/projects" tone="outline">
            All projects
          </ButtonLink>
        </div>
      )}
      <Content />
    </MdxPage>
  );
}
