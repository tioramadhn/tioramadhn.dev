import clsx from 'clsx';
import Link from 'next/link';

import { Container } from '@/components/ui';

import { nav, site, socials } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className={clsx('border-ink mt-24 border-t-[3px]')}>
      <Container>
        <div
          className={clsx(
            'flex flex-col gap-10 py-12',
            'md:flex-row md:justify-between'
          )}
        >
          <div className={clsx('max-w-sm')}>
            <p className={clsx('display-text text-2xl')}>{site.name}</p>
            <p className={clsx('text-ink-soft mt-3 text-sm')}>
              {site.role} · {site.location}
            </p>
            <a
              href={`mailto:${site.email}`}
              className={clsx(
                'hover:bg-lime mt-4 inline-block font-mono text-xs font-bold underline decoration-[3px] underline-offset-4 hover:text-[#11100f]'
              )}
            >
              {site.email}
            </a>
          </div>

          <div className={clsx('flex gap-12')}>
            <div>
              <p
                className={clsx(
                  'mb-3 font-mono text-[11px] font-bold tracking-[0.08em] uppercase'
                )}
              >
                Pages
              </p>
              <ul className={clsx('flex flex-col gap-2 text-sm')}>
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={clsx('hover:text-brand')}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p
                className={clsx(
                  'mb-3 font-mono text-[11px] font-bold tracking-[0.08em] uppercase'
                )}
              >
                Elsewhere
              </p>
              <ul className={clsx('flex flex-col gap-2 text-sm')}>
                {socials.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={clsx('hover:text-brand')}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link href="/credits" className={clsx('hover:text-brand')}>
                    Credits
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div
          className={clsx(
            'border-ink text-ink-soft flex flex-col gap-2 border-t-2 py-6 font-mono text-[11px] tracking-wide uppercase',
            'sm:flex-row sm:justify-between'
          )}
        >
          <span>
            © {new Date().getFullYear()} {site.name}
          </span>
          <span>Next.js · Cloudflare Workers · R2</span>
        </div>
      </Container>
    </footer>
  );
}
