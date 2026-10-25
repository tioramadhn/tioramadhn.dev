'use client';

import clsx from 'clsx';

export const SERIES_NAV_STORAGE_KEY = 'tio-series-nav';

/**
 * Runs before paint so a reader who hid the rail never sees it flash in first.
 * Kept as a raw string because it has to be inlined in <head>, ahead of React —
 * the same approach as the theme script.
 */
export const seriesNavInitScript = `
(function () {
  try {
    if (localStorage.getItem('${SERIES_NAV_STORAGE_KEY}') === 'hidden') {
      document.documentElement.setAttribute('data-series-nav', 'hidden');
    }
  } catch (e) {}
})();
`;

/**
 * Shows or hides the course rail. Like `ThemeToggle`, the state lives on
 * `<html>` rather than in React: the label is picked by CSS, so there is
 * nothing to hydrate and no flash. Hidden only matters from `lg` up, which is
 * where the rail exists at all.
 */
export function SeriesNavToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const hidden = root.getAttribute('data-series-nav') === 'hidden';

    if (hidden) {
      root.removeAttribute('data-series-nav');
    } else {
      root.setAttribute('data-series-nav', 'hidden');
    }

    try {
      localStorage.setItem(SERIES_NAV_STORAGE_KEY, hidden ? 'shown' : 'hidden');
    } catch {
      // Private mode / blocked storage: the attribute still holds for this visit.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={clsx(
        'series-nav-toggle',
        'border-ink bg-paper-raised hidden shrink-0 items-center gap-2 border-[3px] px-4 py-2.5',
        'font-mono text-[11px] font-bold tracking-[0.08em] uppercase',
        'hover:bg-lime hover:text-[#11100f]',
        'lg:inline-flex'
      )}
    >
      <span aria-hidden className={clsx('series-nav-when-shown')}>
        ✕
      </span>
      <span aria-hidden className={clsx('series-nav-when-hidden')}>
        ☰
      </span>
      <span className={clsx('series-nav-when-shown')}>Tutup daftar</span>
      <span className={clsx('series-nav-when-hidden')}>Daftar seri</span>
    </button>
  );
}
