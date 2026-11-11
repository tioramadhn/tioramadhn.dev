'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { StatusBanner } from '@/components/admin/fields';

import { formatDate } from '@/lib/markdown';
import { LOOSE_GROUP_KEY } from '@/lib/posts';

import {
  bulkDeleteAction,
  bulkSetSeriesAction,
  bulkSetStatusAction,
} from './actions';
import { PostRowActions } from './post-row-actions';

import type { BulkResult } from './actions';
import type { PostGroup, PostMeta } from '@/lib/posts';

type StatusFilter = 'all' | 'published' | 'draft';

const buttonClass =
  'border-ink bg-paper-raised border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase hover:bg-lime hover:text-[#11100f] disabled:pointer-events-none disabled:opacity-50';

const checkboxClass = 'border-ink size-4 shrink-0 cursor-pointer border-2';

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * A checkbox that can also sit half-on, for a folder whose instalments are
 * only partly selected. `indeterminate` is a DOM property with no attribute,
 * so it is written in the ref callback rather than through JSX.
 */
function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(node) => {
        if (node) node.indeterminate = indeterminate && !checked;
      }}
      onChange={(event) => onChange(event.target.checked)}
      className={checkboxClass}
    />
  );
}

function PostRow({
  post,
  position,
  clashing,
  selected,
  onSelect,
}: {
  post: PostMeta;
  /** 1-based place in its series, or null for a post in no series. */
  position: number | null;
  /** This post shares its date with a sibling, so its position is arbitrary. */
  clashing: boolean;
  selected: boolean;
  onSelect: (next: boolean) => void;
}) {
  return (
    <li
      className={clsx(
        'border-ink flex flex-col gap-3 border-t-[3px] p-4',
        'md:flex-row md:items-center md:justify-between',
        selected && 'bg-paper-sunken'
      )}
    >
      <div className={clsx('flex min-w-0 items-start gap-3')}>
        <span className={clsx('pt-1')}>
          <Checkbox
            checked={selected}
            onChange={onSelect}
            label={`Select ${post.title}`}
          />
        </span>

        <div className={clsx('min-w-0')}>
          <div className={clsx('mb-1.5 flex flex-wrap items-center gap-2')}>
            {position === null ? null : (
              <span className={clsx('label-chip bg-paper-sunken')}>
                {position}
              </span>
            )}
            <span
              className={clsx(
                'label-chip',
                post.status === 'published'
                  ? 'bg-lime text-[#11100f]'
                  : 'bg-amber text-[#11100f]'
              )}
            >
              {post.status}
            </span>
            <span
              title={
                clashing
                  ? 'Another instalment carries this date, so the reading order between them is arbitrary.'
                  : undefined
              }
              className={clsx(
                'font-mono text-[11px]',
                clashing
                  ? 'border-ink bg-coral border-2 px-1.5 font-bold text-[#11100f]'
                  : 'text-ink-soft'
              )}
            >
              {formatDate(post.date)}
            </span>
            <span className={clsx('text-ink-soft font-mono text-[11px]')}>
              {post.readingTime} min
            </span>
          </div>

          <Link
            href={`/admin/edit/${post.slug}`}
            className={clsx('block truncate text-lg font-bold hover:underline')}
          >
            {post.title}
          </Link>
          <p className={clsx('text-ink-soft truncate font-mono text-[11px]')}>
            /blog/{post.slug}
          </p>
        </div>
      </div>

      <PostRowActions slug={post.slug} status={post.status} />
    </li>
  );
}

/**
 * The admin post list. Posts are folded into one folder per series so a
 * twenty-part course takes one row until it is opened, and every row carries a
 * checkbox feeding the batch bar at the bottom. Filtering and folder state are
 * client-side only: the list arrives whole from the server, which is a single
 * R2 `list()`, so there is nothing to refetch.
 */
export function PostBrowser({ groups }: { groups: PostGroup[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  // Series folders start shut: a twenty-part course is one row until asked
  // for. The loose group has no reading order to scan, and is where a fresh
  // standalone post lands, so it starts open.
  const [opened, setOpened] = useState<ReadonlySet<string>>(
    () => new Set([LOOSE_GROUP_KEY])
  );

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [movingSeries, setMovingSeries] = useState(false);
  const [seriesDraft, setSeriesDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Positions come from the unfiltered group, so filtering never renumbers. */
  const positions = useMemo(() => {
    const found = new Map<string, number>();

    for (const group of groups) {
      if (!group.series) continue;
      group.posts.forEach((post, index) => found.set(post.slug, index + 1));
    }

    return found;
  }, [groups]);

  const filtering = query.trim().length > 0 || status !== 'all';

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return groups
      .map((group) => ({
        group,
        posts: group.posts.filter((post) => {
          if (status !== 'all' && post.status !== status) return false;
          if (!needle) return true;

          return (
            post.title.toLowerCase().includes(needle) ||
            post.slug.includes(needle) ||
            post.tags.some((tag) => tag.includes(needle)) ||
            (group.series?.title.toLowerCase().includes(needle) ?? false)
          );
        }),
      }))
      .filter((entry) => entry.posts.length > 0);
  }, [groups, query, status]);

  const visibleSlugs = visible.flatMap((entry) =>
    entry.posts.map((post) => post.slug)
  );
  const slugs = [...selected];
  const hiddenSelected = slugs.filter(
    (slug) => !visibleSlugs.includes(slug)
  ).length;

  const seriesTitles = groups
    .map((group) => group.series?.title)
    .filter((title): title is string => !!title);

  // Any change to what is selected takes the delete confirmation back down:
  // a primed "delete 3" must never fire against a different 3.
  const changeSelection = (
    next: (previous: ReadonlySet<string>) => ReadonlySet<string>
  ) => {
    setConfirmingDelete(false);
    setSelected(next);
  };

  const toggleOne = (slug: string, on: boolean) =>
    changeSelection((previous) => {
      const next = new Set(previous);
      if (on) next.add(slug);
      else next.delete(slug);
      return next;
    });

  const toggleMany = (targets: string[], on: boolean) =>
    changeSelection((previous) => {
      const next = new Set(previous);
      for (const slug of targets) {
        if (on) next.add(slug);
        else next.delete(slug);
      }
      return next;
    });

  const clearSelection = () => changeSelection(() => new Set());

  const toggleFolder = (key: string) =>
    setOpened((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const isOpen = (key: string) => filtering || opened.has(key);

  const run = (
    action: () => Promise<BulkResult>,
    summarise: (changed: number) => string
  ) => {
    startTransition(async () => {
      setNotice(null);
      setError(null);

      const result = await action();

      setError(result.error ?? null);
      setNotice(summarise(result.changed));
      setConfirmingDelete(false);
      setMovingSeries(false);
      setSeriesDraft('');
      setSelected(new Set());
      router.refresh();
    });
  };

  const total = groups.reduce((count, group) => count + group.posts.length, 0);

  return (
    <div className={clsx('flex flex-col gap-4')}>
      <div className={clsx('panel flex flex-col gap-3 p-4')}>
        <div className={clsx('flex flex-wrap items-center gap-2')}>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by title, slug, tag or series"
            className={clsx(
              'border-ink bg-paper text-ink min-w-0 flex-1 border-[3px] px-3 py-2 font-mono text-sm'
            )}
          />

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
            className={clsx(
              'border-ink bg-paper text-ink border-[3px] px-3 py-2 font-mono text-sm'
            )}
          >
            <option value="all">All statuses</option>
            <option value="published">Published only</option>
            <option value="draft">Drafts only</option>
          </select>
        </div>

        <div className={clsx('flex flex-wrap items-center gap-2')}>
          <button
            type="button"
            onClick={() => setOpened(new Set(groups.map((group) => group.key)))}
            className={buttonClass}
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => setOpened(new Set())}
            className={buttonClass}
          >
            Collapse all
          </button>
          <button
            type="button"
            onClick={() => toggleMany(visibleSlugs, true)}
            className={buttonClass}
          >
            Select {filtering ? 'filtered' : 'all'}
          </button>

          <p className={clsx('text-ink-soft ml-auto font-mono text-[11px]')}>
            {filtering
              ? `${visibleSlugs.length} of ${total} shown`
              : `${plural(total, 'post')} in ${plural(groups.length, 'folder')}`}
          </p>
        </div>
      </div>

      <StatusBanner error={error} message={error ? null : notice} />

      {visible.length === 0 ? (
        <p
          className={clsx(
            'panel text-ink-soft p-5 font-mono text-sm',
            'text-center'
          )}
        >
          No post matches that filter.
        </p>
      ) : (
        <ul className={clsx('flex flex-col gap-4')}>
          {visible.map(({ group, posts }) => {
            const open = isOpen(group.key);
            const groupSlugs = posts.map((post) => post.slug);
            const selectedHere = groupSlugs.filter((slug) =>
              selected.has(slug)
            ).length;

            return (
              <li key={group.key} className={clsx('panel flex flex-col')}>
                <div
                  className={clsx(
                    'flex flex-wrap items-center gap-x-3 gap-y-2 p-4'
                  )}
                >
                  <Checkbox
                    checked={
                      selectedHere > 0 && selectedHere === groupSlugs.length
                    }
                    indeterminate={selectedHere > 0}
                    onChange={(next) => toggleMany(groupSlugs, next)}
                    label={`Select every post in ${group.series?.title ?? 'no series'}`}
                  />

                  <button
                    type="button"
                    onClick={() => toggleFolder(group.key)}
                    aria-expanded={open}
                    disabled={filtering}
                    title={
                      filtering
                        ? 'Folders stay open while a filter is active.'
                        : undefined
                    }
                    className={clsx(
                      'flex min-w-0 items-center gap-2 text-left',
                      'disabled:cursor-default'
                    )}
                  >
                    <span
                      aria-hidden
                      className={clsx(
                        'font-mono text-sm font-bold',
                        !open && 'text-ink-soft'
                      )}
                    >
                      {open ? '▾' : '▸'}
                    </span>
                    <span className={clsx('display-text truncate text-xl')}>
                      {group.series?.title ?? 'No series'}
                    </span>
                  </button>

                  <div
                    className={clsx(
                      'flex flex-wrap items-center gap-2 font-mono text-[11px]'
                    )}
                  >
                    <span className={clsx('label-chip bg-paper-sunken')}>
                      {plural(group.posts.length, 'post')}
                    </span>
                    {group.drafts > 0 ? (
                      <span
                        className={clsx('label-chip bg-amber text-[#11100f]')}
                      >
                        {group.drafts} draft
                      </span>
                    ) : null}
                    {group.clashingDates.length > 0 ? (
                      <span
                        title="Series order is read off the date alone. These dates are carried by more than one instalment, so their order is arbitrary."
                        className={clsx('label-chip bg-coral text-[#11100f]')}
                      >
                        {plural(group.clashingDates.length, 'date')} shared
                      </span>
                    ) : null}
                    <span className={clsx('text-ink-soft')}>
                      {group.readingTime} min
                    </span>
                  </div>

                  {group.series ? (
                    <Link
                      href={`/blog/series/${group.series.slug}`}
                      className={clsx(
                        'text-ink-soft ml-auto font-mono text-[11px] underline'
                      )}
                    >
                      View series
                    </Link>
                  ) : null}
                </div>

                {open ? (
                  <ul className={clsx('flex flex-col')}>
                    {posts.map((post) => (
                      <PostRow
                        key={post.slug}
                        post={post}
                        position={positions.get(post.slug) ?? null}
                        clashing={group.clashingDates.includes(post.date)}
                        selected={selected.has(post.slug)}
                        onSelect={(next) => toggleOne(post.slug, next)}
                      />
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {slugs.length > 0 ? (
        <div className={clsx('sticky bottom-4 z-20')}>
          <div
            className={clsx(
              'panel flex flex-wrap items-center gap-2 p-4',
              'shadow-brutal-lg'
            )}
          >
            <p className={clsx('font-mono text-[11px] font-bold uppercase')}>
              {plural(slugs.length, 'post')} selected
              {hiddenSelected > 0 ? (
                <span className={clsx('text-ink-soft block normal-case')}>
                  {hiddenSelected} of them hidden by the filter
                </span>
              ) : null}
            </p>

            <div className={clsx('ml-auto flex flex-wrap items-center gap-2')}>
              {movingSeries ? (
                <>
                  <input
                    type="text"
                    list="admin-series-titles"
                    value={seriesDraft}
                    onChange={(event) => setSeriesDraft(event.target.value)}
                    placeholder="Series name, or blank to remove"
                    className={clsx(
                      'border-ink bg-paper text-ink border-2 px-2 py-1.5 font-mono text-[11px]'
                    )}
                  />
                  <datalist id="admin-series-titles">
                    {seriesTitles.map((title) => (
                      <option key={title} value={title} />
                    ))}
                  </datalist>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => bulkSetSeriesAction(slugs, seriesDraft),
                        (changed) =>
                          changed === 0
                            ? 'Every selected post was already there.'
                            : seriesDraft.trim()
                              ? `${plural(changed, 'post')} moved into "${seriesDraft.trim()}".`
                              : `${plural(changed, 'post')} removed from their series.`
                      )
                    }
                    className={clsx(buttonClass, 'bg-brand text-paper')}
                  >
                    {seriesDraft.trim() ? 'Move' : 'Remove from series'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovingSeries(false)}
                    className={buttonClass}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => bulkSetStatusAction(slugs, 'published'),
                        (changed) =>
                          changed === 0
                            ? 'Every selected post was already published.'
                            : `${plural(changed, 'post')} published.`
                      )
                    }
                    className={buttonClass}
                  >
                    Publish
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => bulkSetStatusAction(slugs, 'draft'),
                        (changed) =>
                          changed === 0
                            ? 'Every selected post was already a draft.'
                            : `${plural(changed, 'post')} unpublished.`
                      )
                    }
                    className={buttonClass}
                  >
                    Unpublish
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMovingSeries(true);
                      setSeriesDraft('');
                    }}
                    className={buttonClass}
                  >
                    Move to series
                  </button>

                  {confirmingDelete ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => bulkDeleteAction(slugs),
                          (changed) => `${plural(changed, 'post')} deleted.`
                        )
                      }
                      className={clsx(buttonClass, 'bg-coral text-[#11100f]')}
                    >
                      {pending
                        ? 'Deleting…'
                        : `Yes, delete ${plural(slugs.length, 'post')}`}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      className={buttonClass}
                    >
                      Delete
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={clearSelection}
                    className={buttonClass}
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
