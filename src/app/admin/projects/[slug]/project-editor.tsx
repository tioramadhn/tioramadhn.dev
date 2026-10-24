'use client';

import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  Field,
  StatusBanner,
  TextArea,
  TextInput,
  fieldClass,
  labelClass,
} from '@/components/admin/fields';
import { MarkdownField } from '@/components/admin/markdown-field';

import { slugify } from '@/lib/markdown';
import { MASCOT_EXPRESSIONS } from '@/lib/mascot';

import { saveProjectAction } from '@/app/admin/content-actions';

import { ACCENT_CHOICES } from '@/lib/content-types';

import type { MascotExpression } from '@/lib/mascot';
import type { ProjectRecord } from '@/lib/content-types';

const buttonClass =
  'border-ink bg-paper-raised border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase hover:bg-lime hover:text-[#11100f]';

export function ProjectEditor({
  initial,
  isNew = false,
}: {
  initial: ProjectRecord;
  isNew?: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [originalSlug, setOriginalSlug] = useState(isNew ? '' : initial.slug);
  const [slugLocked, setSlugLocked] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof ProjectRecord>(
    key: K,
    value: ProjectRecord[K]
  ) => setValues((current) => ({ ...current, [key]: value }));

  const save = () => {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await saveProjectAction(originalSlug, values);
      if (result.error) {
        setError(result.error);
        return;
      }

      const savedSlug = result.slug ?? values.slug;
      setValues((current) => ({ ...current, slug: savedSlug }));
      setOriginalSlug(savedSlug);
      setSlugLocked(true);
      setMessage('Saved.');

      if (isNew || savedSlug !== initial.slug) {
        router.replace(`/admin/projects/${savedSlug}`);
      }
      router.refresh();
    });
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

  return (
    <div className={clsx('flex flex-col gap-6')}>
      <h1 className={clsx('display-text text-3xl break-words')}>
        {isNew ? 'New project' : values.title}
      </h1>

      <section className={clsx('panel flex flex-col gap-4 p-6')}>
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
            className={clsx(fieldClass, 'text-base font-bold')}
          />
        </Field>

        <div className={clsx('grid gap-4', 'md:grid-cols-2')}>
          <Field label="Slug" hint={`/projects/${values.slug || '…'}`}>
            <TextInput
              value={values.slug}
              onChange={(v) => {
                setSlugLocked(true);
                set('slug', v);
              }}
            />
          </Field>
          <Field label="Caption" hint="Small label on the card.">
            <TextInput
              value={values.caption}
              onChange={(v) => set('caption', v)}
            />
          </Field>
        </div>

        <Field
          label="Card description"
          hint="Shown on the homepage and /projects."
        >
          <TextArea
            value={values.description}
            onChange={(v) => set('description', v)}
          />
        </Field>

        <Field label="Page summary" hint="Subtitle on the project's own page.">
          <TextArea
            value={values.summary}
            onChange={(v) => set('summary', v)}
          />
        </Field>

        <div className={clsx('grid gap-4', 'md:grid-cols-2')}>
          <Field label="Tech stack" hint="Comma separated.">
            <TextInput
              value={values.stack.join(', ')}
              onChange={(v) =>
                set(
                  'stack',
                  v.split(',').map((item) => item.trimStart())
                )
              }
            />
          </Field>
          <Field label="Live site URL" hint="Leave empty to hide the button.">
            <TextInput
              value={values.siteUrl}
              onChange={(v) => set('siteUrl', v)}
              placeholder="https://"
            />
          </Field>
        </div>

        <Field
          label="Cover image"
          hint="Falls back to the accent colour below."
        >
          <div className={clsx('flex gap-2')}>
            <TextInput value={values.cover} onChange={(v) => set('cover', v)} />
            <select
              value={values.coverFit}
              onChange={(event) =>
                set('coverFit', event.target.value as 'cover' | 'contain')
              }
              className={clsx(fieldClass, 'w-36 shrink-0')}
            >
              <option value="cover">Fill (screenshot)</option>
              <option value="contain">Fit (logo)</option>
            </select>
            <label
              className={clsx(
                buttonClass,
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

        <div className={clsx('grid gap-4', 'md:grid-cols-2')}>
          <div className={clsx('flex flex-col gap-2')}>
            <span className={labelClass}>Accent colour</span>
            <div className={clsx('flex flex-wrap gap-2')}>
              {ACCENT_CHOICES.map((accent) => (
                <button
                  key={accent}
                  type="button"
                  aria-label={accent}
                  onClick={() => set('accent', accent)}
                  className={clsx(
                    'border-ink h-9 w-9 border-[3px]',
                    accent,
                    values.accent === accent && 'shadow-brutal-sm'
                  )}
                />
              ))}
            </div>
          </div>

          <Field label="Mascot" hint="Shown beside the project title.">
            <select
              value={values.mascot}
              onChange={(event) =>
                set('mascot', event.target.value as MascotExpression)
              }
              className={fieldClass}
            >
              {Object.keys(MASCOT_EXPRESSIONS).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <MarkdownField
        value={values.body}
        onChange={(body) => set('body', body)}
        onError={setError}
        onMessage={setMessage}
      />

      <StatusBanner error={error} message={message} />

      <div
        className={clsx(
          'border-ink bg-paper-raised sticky bottom-0 flex flex-wrap items-center gap-3 border-[3px] p-4'
        )}
      >
        <button
          type="button"
          disabled={pending || uploading}
          onClick={save}
          className={clsx(
            'border-ink bg-ink text-paper shadow-brutal panel-interactive border-[3px] px-5 py-2 font-mono text-[11px] font-bold tracking-[0.08em] uppercase disabled:pointer-events-none disabled:opacity-50'
          )}
        >
          {pending ? 'Saving…' : 'Save project'}
        </button>

        {originalSlug ? (
          <a
            href={`/projects/${originalSlug}`}
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
