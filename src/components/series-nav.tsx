import clsx from 'clsx';
import Link from 'next/link';

import { Chip } from '@/components/ui';

import type { SeriesContext } from '@/lib/posts';

const stepClass =
  'border-ink bg-paper-raised flex min-w-0 flex-1 flex-col gap-1.5 border-[3px] p-5';

/**
 * Footer navigation for a post that belongs to a series: how far through the
 * reader is, the two neighbours, and the full running order. The list is a
 * native `<details>` so it needs no client JavaScript — the whole post page is
 * a server component.
 */
export function SeriesNav({ context }: { context: SeriesContext }) {
  const { series, items, index, previous, next } = context;
  const position = index + 1;

  return (
    <nav
      aria-label={`${series.title} series`}
      className={clsx('mt-16 flex flex-col gap-4')}
    >
      <div
        className={clsx(
          'border-ink bg-paper-raised shadow-brutal border-[3px] p-5'
        )}
      >
        <div className={clsx('flex flex-wrap items-center gap-x-3 gap-y-2')}>
          <Link
            href={`/blog/series/${series.slug}`}
            className={clsx('hover:underline')}
          >
            <Chip className={clsx('bg-lime text-[#11100f]')}>
              {series.title}
            </Chip>
          </Link>
          <span className={clsx('text-ink-soft font-mono text-[11px]')}>
            Bagian {position} dari {items.length}
          </span>
        </div>

        {/* One segment per instalment: filled up to and including this one.
            The accent fill is what carries the contrast, so it reads the same
            whichever way the paper/ink variables flip in dark mode. */}
        <div
          className={clsx(
            'border-ink bg-paper mt-4 flex h-3 gap-[3px] border-2 p-[3px]'
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
      </div>

      <div className={clsx('flex flex-col gap-4', 'sm:flex-row')}>
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

        <ol className={clsx('border-ink border-t-[3px]')}>
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
                    'flex items-baseline gap-3 px-5 py-3',
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
      </details>
    </nav>
  );
}
