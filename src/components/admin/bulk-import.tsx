'use client';

import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { parseFrontMatter } from '@/lib/front-matter';
import { slugify, today } from '@/lib/markdown';

import { savePostAction } from '@/app/admin/actions';

import type { PostStatus } from '@/lib/posts';

interface ImportResult {
  file: string;
  slug?: string;
  error?: string;
}

/**
 * Imports a batch of markdown files as posts in one go. Each file keeps its
 * own front matter; anything missing falls back to the filename and today's
 * date. Posts land as drafts unless their front matter says otherwise, so an
 * accidental bulk import never publishes anything.
 */
export function BulkImport() {
  const router = useRouter();
  const [results, setResults] = useState<ImportResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const importFiles = async (files: File[]) => {
    setBusy(true);
    setResults([]);

    const collected: ImportResult[] = [];

    for (const file of files) {
      try {
        const { meta, body } = parseFrontMatter(await file.text());
        const title = meta.title ?? file.name.replace(/\.mdx?$/, '');
        const status: PostStatus =
          meta.status === 'published' ? 'published' : 'draft';

        const result = await savePostAction({
          originalSlug: '',
          slug: slugify(meta.slug ?? title),
          title,
          description: meta.description ?? '',
          date: /^\d{4}-\d{2}-\d{2}$/.test(meta.date ?? '')
            ? (meta.date as string)
            : today(),
          tags: meta.tags ?? '',
          cover: meta.cover ?? '',
          series: meta.series ?? '',
          body,
          status,
        });

        collected.push(
          result.error
            ? { file: file.name, error: result.error }
            : { file: file.name, slug: result.slug }
        );
      } catch (error) {
        collected.push({
          file: file.name,
          error:
            error instanceof Error ? error.message : 'Could not read file.',
        });
      }

      setResults([...collected]);
    }

    setBusy(false);
    startTransition(() => router.refresh());
  };

  const failed = results.filter((result) => result.error).length;

  return (
    <div className={clsx('panel flex flex-col gap-4 p-5')}>
      <div
        className={clsx('flex flex-wrap items-center justify-between gap-3')}
      >
        <div>
          <p
            className={clsx(
              'font-mono text-[11px] font-bold tracking-[0.08em] uppercase'
            )}
          >
            Bulk import
          </p>
          <p className={clsx('text-ink-soft mt-1 text-sm')}>
            Pick several .md files at once. They arrive as drafts unless their
            front matter says{' '}
            <code className={clsx('font-mono')}>published</code>.
          </p>
        </div>

        <label
          className={clsx(
            'border-ink bg-paper-raised shadow-brutal-sm panel-interactive shrink-0 cursor-pointer border-[3px] px-4 py-2 font-mono text-[11px] font-bold tracking-[0.08em] uppercase',
            busy && 'pointer-events-none opacity-50'
          )}
        >
          {busy ? 'Importing…' : 'Choose files'}
          <input
            type="file"
            accept=".md,.mdx,text/markdown"
            multiple
            hidden
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length > 0) void importFiles(files);
              event.target.value = '';
            }}
          />
        </label>
      </div>

      {results.length > 0 ? (
        <>
          <ul className={clsx('flex flex-col gap-1')}>
            {results.map((result) => (
              <li
                key={result.file}
                className={clsx(
                  'border-ink flex flex-wrap items-center gap-2 border-2 px-3 py-1.5 font-mono text-[11px]',
                  result.error
                    ? 'bg-coral text-[#11100f]'
                    : 'bg-lime text-[#11100f]'
                )}
              >
                <span className={clsx('font-bold')}>
                  {result.error ? '✕' : '✓'}
                </span>
                <span className={clsx('truncate')}>{result.file}</span>
                <span className={clsx('ml-auto truncate')}>
                  {result.error ?? `/blog/${result.slug}`}
                </span>
              </li>
            ))}
          </ul>
          <p className={clsx('text-ink-soft font-mono text-[11px]')}>
            {results.length - failed} imported
            {failed > 0 ? `, ${failed} failed` : ''}.
          </p>
        </>
      ) : null}
    </div>
  );
}
