import clsx from 'clsx';
import Link from 'next/link';

import { Mascot } from '@/components/mascot';
import { ProjectCard } from '@/components/project-card';
import { ButtonLink, Chip, Container, SectionHeading } from '@/components/ui';

import { getProjects, getSettings } from '@/lib/content';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [{ profile, hero, stack, highlights }, projects] = await Promise.all([
    getSettings(),
    getProjects(),
  ]);

  return (
    <>
      <section className={clsx('border-ink border-b-[3px] py-16', 'md:py-24')}>
        <Container>
          <div
            className={clsx(
              'flex flex-col-reverse items-start gap-8',
              'lg:flex-row lg:items-center lg:justify-between lg:gap-12'
            )}
          >
            <div className={clsx('min-w-0 flex-1')}>
              <div className={clsx('flex flex-col gap-3')}>
                {profile.openToWork ? (
                  <Chip className={clsx('bg-lime w-fit text-[#11100f]')}>
                    <span
                      aria-hidden
                      className={clsx('inline-block h-2 w-2 bg-[#11100f]')}
                    />
                    Open to opportunities
                  </Chip>
                ) : null}

                <h1
                  className={clsx(
                    'display-text text-5xl',
                    'sm:text-6xl md:text-7xl lg:text-8xl'
                  )}
                >
                  {hero.headline.split('\n').map((line, index) => (
                    <span key={line || index} className={clsx('block')}>
                      {line}
                    </span>
                  ))}
                </h1>

                <p
                  className={clsx(
                    'mt-2 max-w-2xl text-lg leading-relaxed',
                    'md:text-xl'
                  )}
                >
                  <strong className={clsx('bg-amber px-1 text-[#11100f]')}>
                    {profile.role}
                  </strong>{' '}
                  {hero.intro}
                </p>
              </div>

              <div className={clsx('mt-8 flex flex-wrap gap-3')}>
                <ButtonLink href="/work/contact">Get in touch</ButtonLink>
                <ButtonLink href="/projects" tone="outline">
                  See projects
                </ButtonLink>
                {profile.resumeUrl ? (
                  <ButtonLink href={profile.resumeUrl} tone="accent" external>
                    Résumé
                  </ButtonLink>
                ) : null}
              </div>

              {stack.length > 0 ? (
                <div className={clsx('mt-12')}>
                  <p
                    className={clsx(
                      'text-ink-soft mb-3 font-mono text-[11px] tracking-[0.08em] uppercase'
                    )}
                  >
                    Current favourite stack
                  </p>
                  <ul className={clsx('flex flex-wrap gap-2')}>
                    {stack.map((item) => (
                      <li key={item}>
                        <Chip className={clsx('bg-paper-raised')}>{item}</Chip>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <Mascot
              expression="waving"
              size={300}
              className={clsx('-mb-4 self-center', 'lg:mb-0')}
            />
          </div>
        </Container>
      </section>

      {highlights.length > 0 ? (
        <section className={clsx('border-ink border-b-[3px] py-14')}>
          <Container>
            <div className={clsx('grid gap-5', 'md:grid-cols-3')}>
              {highlights.map((item) => (
                <div key={item.label} className={clsx('panel p-6')}>
                  <Chip className={clsx('bg-pink mb-4 text-[#11100f]')}>
                    {item.label}
                  </Chip>
                  <p className={clsx('text-xl font-bold')}>{item.title}</p>
                  <p className={clsx('text-ink-soft mt-2 text-sm')}>
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      <section className={clsx('py-16')}>
        <Container>
          <SectionHeading caption="Selected work" title="Projects">
            Platform work, products with real users, and the occasional
            redesign. Each one has a write-up.
          </SectionHeading>

          <div className={clsx('grid gap-6', 'md:grid-cols-2')}>
            {projects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>

          <div className={clsx('mt-10')}>
            <ButtonLink href="/blog" tone="outline">
              Read the blog
            </ButtonLink>
          </div>
        </Container>
      </section>

      <section className={clsx('border-ink border-t-[3px] py-16')}>
        <Container>
          <div
            className={clsx(
              'panel bg-brand flex flex-col gap-6 p-8 text-white',
              'md:flex-row md:items-center md:justify-between md:p-12'
            )}
          >
            <div>
              <h2 className={clsx('display-text text-3xl', 'md:text-4xl')}>
                {hero.ctaTitle}
              </h2>
              <p className={clsx('mt-3 max-w-md text-base')}>{hero.ctaBody}</p>
            </div>
            <Link
              href="/work/contact"
              className={clsx(
                'border-ink bg-lime shadow-brutal panel-interactive inline-flex shrink-0 items-center border-[3px] px-6 py-3 font-mono text-xs font-bold tracking-[0.08em] text-[#11100f] uppercase'
              )}
            >
              Contact me
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
