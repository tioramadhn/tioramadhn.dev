import clsx from 'clsx';
import Link from 'next/link';

import { Chip } from '@/components/ui';

import type { Project } from '@/content/projects';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className={clsx('panel panel-interactive flex flex-col')}>
      <Link
        href={`/projects/${project.slug}`}
        className={clsx('flex flex-1 flex-col')}
      >
        <div
          className={clsx(
            'border-ink flex h-40 items-end border-b-[3px] bg-cover bg-left-top p-4',
            !project.cover && project.accent
          )}
          style={
            project.cover
              ? { backgroundImage: `url(${project.cover})` }
              : undefined
          }
        >
          <Chip className={clsx('bg-paper-raised')}>{project.caption}</Chip>
        </div>

        <div className={clsx('flex flex-1 flex-col p-6')}>
          <h2 className={clsx('display-text text-2xl')}>{project.title}</h2>
          <p className={clsx('text-ink-soft mt-3 flex-1 text-sm')}>
            {project.description}
          </p>
          <ul className={clsx('mt-5 flex flex-wrap gap-1.5')}>
            {project.stack.map((item) => (
              <li
                key={item}
                className={clsx(
                  'border-ink border-2 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase'
                )}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Link>
    </article>
  );
}
