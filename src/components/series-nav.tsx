import clsx from 'clsx';
import Link from 'next/link';

import { MarkRead } from '@/components/series-progress';
import { Chip } from '@/components/ui';

import type { PostMeta, SeriesContext } from '@/lib/posts';

const stepClass =
  'border-ink bg-paper-raised flex min-w-0 flex-1 flex-col gap-1.5 border-[3px] p-5';

/**
 * One segment per instalment, filled up to and including the current one. The
 * accent fill carries the contrast, so it reads the same whichever way the
 * paper/ink variables flip in dark mode.
 */
function Progress({ items, index }: { items: PostMeta[]; index: number }) {
  return (
    <div
      className={clsx(
        'border-ink bg-paper flex h-3 gap-[3px] border-2 p-[3px]'
      )}
    >
      {items.map((item, itemIndex) => (
        <span
          key={item.slug}
          className={clsx(
            'flex-1',
            itemIndex <= index ? 'bg-lime' : 'bg-transparent'
          )}
        />
      ))}
    </div>
  );
}

function RunningOrder({ items, index }: { items: PostMeta[]; index: number }) {
  return (
    <ol>
      {items.map((item, itemIndex) => {
        const isCurrent = itemIndex === index;

        return (
          <li
            key={item.slug}
            className={clsx(
              'border-ink border-b-2 last:border-b-0',
              isCurrent && 'bg-lime text-[#11100f]'
            )}
          >
            <Link
              href={`/blog/${item.slug}`}
              aria-current={isCurrent ? 'page' : undefined}
              className={clsx(
                'flex items-baseline gap-3 px-4 py-2.5',
                !isCurrent && 'hover:bg-paper-raised'
              )}
            >
              <span
                className={clsx(
                  'shrink-0 font-mono text-[11px]',
                  !isCurrent && 'text-ink-soft'
                )}
              >
                {String(itemIndex + 1).padStart(2, '0')}
              </span>
              <span
                className={clsx(
                  'min-w-0 flex-1 text-sm break-words',
                  isCurrent && 'font-bold'
                )}
              >
                {item.title}
              </span>
              <span
                className={clsx(
                  'shrink-0 font-mono text-[11px]',
                  !isCurrent && 'text-ink-soft'
                )}
              >
                {item.readingTime}m
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function Header({ context }: { context: SeriesContext }) {
  const { series, items, index } = context;

  return (
    <>
      <div className={clsx('flex flex-wrap items-center gap-x-3 gap-y-2')}>
        <Link
          href={`/blog/series/${series.slug}`}
          className={clsx('hover:underline')}
        >
          <Chip className={clsx('bg-lime text-[#11100f]')}>{series.title}</Chip>
        </Link>
        <span className={clsx('text-ink-soft font-mono text-[11px]')}>
          Bagian {index + 1} dari {items.length}
        </span>
      </div>

      <div className={clsx('mt-4')}>
        <Progress items={items} index={index} />
      </div>

      <div className={clsx('mt-4')}>
        <MarkRead
          seriesSlug={series.slug}
          postSlug={items[index]?.slug ?? ''}
        />
      </div>
    </>
  );
}

/**
 * The sticky course rail, shown from `lg` up and hidden below it. Whether it is
 * on at all is a CSS matter driven by `data-series-nav` on `<html>`, so the
 * toggle needs no React state and the server renders one markup either way —
 * see `series-nav-toggle.tsx`.
 */
export function SeriesSidebar({ context }: { context: SeriesContext }) {
  const { series, items, index } = context;

  return (
    <aside
      aria-label={`Daftar ${series.title}`}
      className={clsx('series-sidebar')}
    >
      <div className={clsx('series-rail')}>
        <div className={clsx('border-ink bg-paper-raised border-[3px] p-4')}>
          <Header context={context} />
        </div>

        <div
          className={clsx(
            'border-ink min-h-0 flex-1 overflow-y-auto border-[3px] border-t-0'
          )}
        >
          <RunningOrder items={items} index={index} />
        </div>
      </div>
    </aside>
  );
}

/**
 * The same information for narrow screens, where there is no room for a rail:
 * progress up top and the running order behind a native `<details>`.
 */
export function SeriesSummary({ context }: { context: SeriesContext }) {
  const { series, items, index } = context;

  return (
    <nav
      aria-label={`${series.title} series`}
      className={clsx('mb-10 flex flex-col gap-4', 'lg:hidden')}
    >
      <div
        className={clsx(
          'border-ink bg-paper-raised shadow-brutal border-[3px] p-5'
        )}
      >
        <Header context={context} />
      </div>

      <details className={clsx('panel group p-0')}>
        <summary
          className={clsx(
            'flex cursor-pointer list-none items-center justify-between gap-3 p-5',
            'font-mono text-[11px] font-bold tracking-[0.08em] uppercase',
            'hover:bg-lime hover:text-[#11100f]'
          )}
        >
          Daftar seri · {items.length} materi
          <span className={clsx('transition-transform group-open:rotate-180')}>
            ▾
          </span>
        </summary>

        <div className={clsx('border-ink border-t-[3px]')}>
          <RunningOrder items={items} index={index} />
        </div>
      </details>
    </nav>
  );
}

/**
 * Previous and next, below the article. This stays out of the sidebar on
 * purpose: it belongs where the reader is when they finish, and the two titles
 * are far too long for a 16rem rail.
 */
export function SeriesSteps({ context }: { context: SeriesContext }) {
  const { series, previous, next } = context;

  return (
    <nav
      aria-label={`Navigasi ${series.title}`}
      className={clsx('mt-16 flex flex-col gap-4', 'sm:flex-row')}
    >
      {previous ? (
        <Link
          href={`/blog/${previous.slug}`}
          className={clsx(stepClass, 'panel-interactive')}
        >
          <span
            className={clsx('text-ink-soft font-mono text-[11px] uppercase')}
          >
            ← Sebelumnya
          </span>
          <span className={clsx('leading-snug font-bold break-words')}>
            {previous.title}
          </span>
        </Link>
      ) : (
        <div className={clsx(stepClass, 'text-ink-soft border-dashed')}>
          <span className={clsx('font-mono text-[11px] uppercase')}>
            Awal seri
          </span>
          <span className={clsx('text-sm')}>Ini materi pertama.</span>
        </div>
      )}

      {next ? (
        <Link
          href={`/blog/${next.slug}`}
          className={clsx(
            stepClass,
            'panel-interactive',
            'sm:items-end sm:text-right'
          )}
        >
          <span
            className={clsx('text-ink-soft font-mono text-[11px] uppercase')}
          >
            Sesudahnya →
          </span>
          <span className={clsx('leading-snug font-bold break-words')}>
            {next.title}
          </span>
        </Link>
      ) : (
        <div
          className={clsx(
            stepClass,
            'text-ink-soft border-dashed',
            'sm:items-end sm:text-right'
          )}
        >
          <span className={clsx('font-mono text-[11px] uppercase')}>
            Akhir seri
          </span>
          <span className={clsx('text-sm')}>Ini materi terakhir.</span>
        </div>
      )}
    </nav>
  );
}
