'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';

const KEY = 'tio-series-read';

type ReadMap = Record<string, string[]>;

function read(): ReadMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ReadMap) : {};
  } catch {
    // Private windows and blocked site data both land here; progress is a
    // convenience, so the page must render fine without it.
    return {};
  }
}

/**
 * Returns the raw stored string. Strings compare by value, so React's
 * `Object.is` check settles and this never loops.
 */
function getSnapshot(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab ticking a module should update this one too.
  window.addEventListener('storage', listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

/**
 * `useSyncExternalStore` is what keeps this honest: the server snapshot is
 * always "nothing read", so the first client render matches the HTML and only
 * then swaps in the stored value. Reading localStorage in an effect and calling
 * setState would trip the React Compiler rules this project lints for.
 */
function useReadSlugs(seriesSlug: string): string[] {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => '');

  if (!snapshot) return [];

  try {
    return (JSON.parse(snapshot) as ReadMap)[seriesSlug] ?? [];
  } catch {
    return [];
  }
}

function toggle(seriesSlug: string, postSlug: string) {
  const all = read();
  const current = all[seriesSlug] ?? [];

  all[seriesSlug] = current.includes(postSlug)
    ? current.filter((slug) => slug !== postSlug)
    : [...current, postSlug];

  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Nothing to do: the tick simply will not persist.
  }

  emit();
}

/** The "mark as read" control shown at the end of a series instalment. */
export function MarkRead({
  seriesSlug,
  postSlug,
}: {
  seriesSlug: string;
  postSlug: string;
}) {
  const isRead = useReadSlugs(seriesSlug).includes(postSlug);

  return (
    <button
      type="button"
      onClick={() => toggle(seriesSlug, postSlug)}
      aria-pressed={isRead}
      className={clsx(
        'border-ink flex items-center gap-2 border-[3px] px-4 py-2',
        'font-mono text-[11px] font-bold tracking-[0.08em] uppercase',
        isRead ? 'bg-lime text-[#11100f]' : 'bg-paper-raised hover:bg-lime'
      )}
    >
      <span aria-hidden>{isRead ? '✓' : '○'}</span>
      {isRead ? 'Sudah dibaca' : 'Tandai sudah dibaca'}
    </button>
  );
}

export interface SeriesItem {
  slug: string;
  title: string;
}

/**
 * Resume banner for a series index: how many instalments are ticked off and
 * where to pick up. Renders nothing until something has been read, so a first
 * visit sees no clutter.
 */
export function ResumeSeries({
  seriesSlug,
  items,
}: {
  seriesSlug: string;
  items: SeriesItem[];
}) {
  const readSlugs = useReadSlugs(seriesSlug);

  if (readSlugs.length === 0) return null;

  const next = items.find((item) => !readSlugs.includes(item.slug));
  const done = items.filter((item) => readSlugs.includes(item.slug)).length;

  return (
    <div
      className={clsx(
        'border-ink bg-paper-raised shadow-brutal mb-8 flex flex-col gap-3 border-[3px] p-5',
        'sm:flex-row sm:items-center sm:justify-between'
      )}
    >
      <p className={clsx('font-mono text-[11px] tracking-[0.08em] uppercase')}>
        {done} dari {items.length} selesai
      </p>

      {next ? (
        <Link
          href={`/blog/${next.slug}`}
          className={clsx(
            'border-ink bg-lime panel-interactive border-[3px] px-4 py-2 text-[#11100f]',
            'font-mono text-[11px] font-bold tracking-[0.08em] uppercase'
          )}
        >
          Lanjutkan →{' '}
          {next.title.length > 46
            ? `${next.title.slice(0, 46).trimEnd()}…`
            : next.title}
        </Link>
      ) : (
        <p className={clsx('font-mono text-[11px] uppercase')}>
          Seri ini sudah kamu selesaikan 🎉
        </p>
      )}
    </div>
  );
}
