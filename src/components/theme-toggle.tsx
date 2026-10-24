'use client';

import clsx from 'clsx';

type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'tio-theme';

/**
 * Runs before paint so the first frame already has the right theme. Kept as a
 * raw string because it has to be inlined in <head>, ahead of React.
 */
export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

/**
 * The current theme lives on <html> rather than in React state: the icon is
 * picked by the `dark:` variant, so there is nothing to hydrate and no flash.
 */
export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const next: Theme = root.classList.contains('dark') ? 'light' : 'dark';

    root.classList.toggle('dark', next === 'dark');

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode / blocked storage: the class still applies for this visit.
    }
  };

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      onClick={toggle}
      className={clsx(
        'border-ink bg-amber shadow-brutal-sm panel-interactive flex h-10 w-10 items-center justify-center border-[3px] text-[#11100f]'
      )}
    >
      <span aria-hidden className={clsx('text-base leading-none')}>
        <span className={clsx('inline dark:hidden')}>☾</span>
        <span className={clsx('hidden dark:inline')}>☀</span>
      </span>
    </button>
  );
}
