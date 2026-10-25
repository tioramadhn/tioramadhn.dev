'use client';

import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  Field,
  TextArea,
  TextInput,
  fieldClass,
} from '@/components/admin/fields';
import { MarkdownField } from '@/components/admin/markdown-field';
import { Mascot } from '@/components/mascot';

import { parseFrontMatter } from '@/lib/front-matter';
import { slugify } from '@/lib/markdown';

import { savePostAction } from '@/app/admin/actions';

import type { SavePostPayload } from '@/app/admin/actions';
import type { PostStatus } from '@/lib/posts';

export interface PostEditorValues {
  originalSlug: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string;
  cover: string;
  series: string;
  body: string;
  status: PostStatus;
}

const toolbarButtonClass =
  'border-ink bg-paper-raised border-2 px-2 py-1 font-mono text-[11px] font-bold uppercase hover:bg-lime hover:text-[#11100f]';

export function PostEditor({ initial }: { initial: PostEditorValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [slugLocked, setSlugLocked] = useState(!!initial.originalSlug);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof PostEditorValues>(
    key: K,
    value: PostEditorValues[K]
  ) => setValues((current) => ({ ...current, [key]: value }));

  /** Fills the form from a local .md/.mdx file, front matter included. */
  const importMarkdownFile = async (file: File) => {
    setError(null);

    const { meta, body } = parseFrontMatter(await file.text());
    const title = meta.title ?? file.name.replace(/\.mdx?$/, '');

    setValues((current) => ({
      ...current,
      title,
      slug: current.originalSlug || slugify(meta.slug ?? title),
      description: meta.description ?? current.description,
      date: /^\d{4}-\d{2}-\d{2}$/.test(meta.date ?? '')
        ? (meta.date as string)
        : current.date,
      tags: meta.tags ?? current.tags,
      cover: meta.cover ?? current.cover,
      series: meta.series ?? current.series,
      body,
    }));
    setSlugLocked(true);
    setMessage(`Imported ${file.name}. Review it, then save.`);
  };

  const uploadCover = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append('file', file);

      const response = await fetch('/api/media', {
        method: 'POST',
        body: form,
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? 'Upload failed.');
      }

      set('cover', data.url);
      setMessage('Cover uploaded.');
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'Upload failed.'
      );
    } finally {
      setUploading(false);
    }
  };

  const submit = (status: PostStatus) => {
    setError(null);
    setMessage(null);

    const payload: SavePostPayload = { ...values, status };

    startTransition(async () => {
      const result = await savePostAction(payload);

      if (result.error) {
        setError(result.error);
        return;
      }

      const savedSlug = result.slug ?? values.slug;

      setValues((current) => ({
        ...current,
        status,
        slug: savedSlug,
        originalSlug: savedSlug,
      }));
      setSlugLocked(true);
      setMessage(status === 'published' ? 'Published.' : 'Draft saved.');

      if (savedSlug !== initial.originalSlug) {
        router.replace(`/admin/edit/${savedSlug}`);
      }
      router.refresh();
    });
  };

  const busy = pending || uploading;

  return (
    <div className={clsx('flex flex-col gap-6')}>
      <div className={clsx('panel flex flex-col gap-4 p-6')}>
        <Field label="Title">
          <input
            value={values.title}
            onChange={(event) => {
              const title = event.target.value;
              setValues((current) => ({
                ...current,
                title,
                slug: slugLocked ? current.slug : slugify(title),
              }));
            }}
            placeholder="What is this post about?"
            className={clsx(fieldClass, 'text-base font-bold')}
          />
        </Field>

        <div className={clsx('grid gap-4', 'md:grid-cols-2')}>
          <Field label="Slug" hint={`/blog/${values.slug || '…'}`}>
            <TextInput
              value={values.slug}
              onChange={(v) => {
                setSlugLocked(true);
                set('slug', v);
              }}
              placeholder="post-url"
            />
          </Field>
          <Field label="Date">
            <TextInput
              type="date"
              value={values.date}
              onChange={(v) => set('date', v)}
            />
          </Field>
        </div>

        <Field label="Description">
          <TextArea
            rows={2}
            value={values.description}
            onChange={(v) => set('description', v)}
            placeholder="One or two sentences for the post list and social cards."
          />
        </Field>

        <div className={clsx('grid gap-4', 'md:grid-cols-2')}>
          <Field label="Tags" hint="Comma separated, up to six.">
            <TextInput
              value={values.tags}
              onChange={(v) => set('tags', v)}
              placeholder="react, cloudflare, notes"
            />
          </Field>

          <Field
            label="Series"
            hint={
              values.series
                ? `Ordered by date · /blog/series/${slugify(values.series)}`
                : 'Leave empty for a standalone post.'
            }
          >
            <TextInput
              value={values.series}
              onChange={(v) => set('series', v)}
              placeholder="Tutorial Web 3"
            />
          </Field>
        </div>

        <Field label="Cover image">
          <div className={clsx('flex gap-2')}>
            <TextInput
              value={values.cover}
              onChange={(v) => set('cover', v)}
              placeholder="/media/2026/10/cover.png"
            />
            <label
              className={clsx(
                toolbarButtonClass,
                'flex shrink-0 cursor-pointer items-center'
              )}
            >
              {uploading ? 'Uploading…' : 'Upload'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadCover(file);
                  event.target.value = '';
                }}
              />
            </label>
          </div>
        </Field>
      </div>

      <MarkdownField
        value={values.body}
        onChange={(body) => set('body', body)}
        onError={setError}
        onMessage={setMessage}
        extraToolbar={
          <label className={clsx(toolbarButtonClass, 'cursor-pointer')}>
            Import .md
            <input
              type="file"
              accept=".md,.mdx,text/markdown"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importMarkdownFile(file);
                event.target.value = '';
              }}
            />
          </label>
        }
      />

      {error ? (
        <div
          className={clsx(
            'border-ink bg-coral flex items-center gap-2 border-[3px] px-4 py-2 text-[#11100f]'
          )}
        >
          <Mascot expression="burnedOut" size={56} className={clsx('-my-3')} />
          <p className={clsx('font-mono text-xs')}>{error}</p>
        </div>
      ) : null}

      {message && !error ? (
        <div
          className={clsx(
            'border-ink bg-lime flex items-center gap-2 border-[3px] px-4 py-2 text-[#11100f]'
          )}
        >
          {values.status === 'published' && message === 'Published.' ? (
            <Mascot
              expression="celebrating"
              size={56}
              play="once"
              className={clsx('-my-3')}
            />
          ) : null}
          <p className={clsx('font-mono text-xs')}>{message}</p>
        </div>
      ) : null}

      <div
        className={clsx(
          'border-ink bg-paper-raised sticky bottom-0 flex flex-wrap items-center gap-3 border-[3px] p-4'
        )}
      >
        <span
          className={clsx(
            'label-chip',
            values.status === 'published'
              ? 'bg-lime text-[#11100f]'
              : 'bg-amber text-[#11100f]'
          )}
        >
          {values.status}
        </span>

        <button
          type="button"
          disabled={busy}
          onClick={() => submit('draft')}
          className={clsx(
            'border-ink bg-paper shadow-brutal-sm panel-interactive border-[3px] px-4 py-2 font-mono text-[11px] font-bold tracking-[0.08em] uppercase disabled:pointer-events-none disabled:opacity-50'
          )}
        >
          Save draft
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => submit('published')}
          className={clsx(
            'border-ink bg-ink text-paper shadow-brutal panel-interactive border-[3px] px-5 py-2 font-mono text-[11px] font-bold tracking-[0.08em] uppercase disabled:pointer-events-none disabled:opacity-50'
          )}
        >
          {pending ? 'Saving…' : 'Publish'}
        </button>

        {values.originalSlug && values.status === 'published' ? (
          <a
            href={`/blog/${values.originalSlug}`}
            target="_blank"
            rel="noreferrer"
            className={clsx(
              'text-ink-soft ml-auto font-mono text-[11px] uppercase underline'
            )}
          >
            View live ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}
