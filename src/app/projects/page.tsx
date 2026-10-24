import clsx from 'clsx';

import { ProjectCard } from '@/components/project-card';
import { Container, PageHeader } from '@/components/ui';

import { projects } from '@/content/projects';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects',
  description:
    'Platform work, products with real users, and redesigns — with a write-up for each.',
};

export default function ProjectsPage() {
  return (
    <Container className={clsx('py-14', 'md:py-20')}>
      <PageHeader
        caption="Portfolio"
        title="Projects"
        description="A banking platform rebuilt as micro-frontends, an AI study assistant with 200,000+ users, and a redesign that reached the top of Google."
        mascot="focused"
      />
      <div className={clsx('grid gap-6', 'md:grid-cols-2')}>
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </Container>
  );
}
