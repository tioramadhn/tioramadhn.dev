import clsx from 'clsx';
import Link from 'next/link';

import { Mascot } from '@/components/mascot';

import { requireAuth } from '@/lib/auth';
import { getProjects } from '@/lib/content';

import { ProjectRowActions } from './project-row-actions';

export const dynamic = 'force-dynamic';

export default async function AdminProjectsPage() {
  await requireAuth();
  const projects = await getProjects();

  return (
    <div className={clsx('flex flex-col gap-6')}>
      <div
        className={clsx('flex flex-wrap items-center justify-between gap-4')}
      >
        <div className={clsx('flex items-center gap-3')}>
          <Mascot expression="focused" size={72} className={clsx('-my-4')} />
          <h1 className={clsx('display-text text-3xl')}>Projects</h1>
        </div>
        <Link
          href="/admin/projects/new"
          className={clsx(
            'border-ink bg-ink text-paper shadow-brutal panel-interactive border-[3px] px-5 py-2.5 font-mono text-[11px] font-bold tracking-[0.08em] uppercase'
          )}
        >
          + New project
        </Link>
      </div>

      <ul className={clsx('flex flex-col gap-4')}>
        {projects.map((project, index) => (
          <li
            key={project.slug}
            className={clsx(
              'panel flex flex-col gap-4 p-5',
              'md:flex-row md:items-center md:justify-between'
            )}
          >
            <div className={clsx('min-w-0')}>
              <span
                className={clsx('label-chip bg-paper-raised mb-2 inline-flex')}
              >
                {project.caption || 'Project'}
              </span>
              <Link
                href={`/admin/projects/${project.slug}`}
                className={clsx(
                  'block truncate text-lg font-bold hover:underline'
                )}
              >
                {project.title}
              </Link>
              <p
                className={clsx('text-ink-soft truncate font-mono text-[11px]')}
              >
                /projects/{project.slug}
              </p>
            </div>

            <ProjectRowActions
              slug={project.slug}
              isFirst={index === 0}
              isLast={index === projects.length - 1}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
