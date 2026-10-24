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
} from '@/components/admin/fields';
import { MarkdownField } from '@/components/admin/markdown-field';

import { MASCOT_EXPRESSIONS } from '@/lib/mascot';

import { savePageAction } from '@/app/admin/content-actions';

import type { MascotExpression } from '@/lib/mascot';
import type { PageRecord } from '@/lib/content-types';

export function PageEditor({ initial }: { initial: PageRecord }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof PageRecord>(key: K, value: PageRecord[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const save = () => {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await savePageAction(values);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage('Saved.');
      router.refresh();
    });
  };

  const route = values.slug === 'credits' ? '/credits' : `/work/${values.slug}`;

  return (
    <div className={clsx('flex flex-col gap-6')}>
      <h1 className={clsx('display-text text-3xl break-words')}>
        {values.title}
      </h1>

      <section className={clsx('panel flex flex-col gap-4 p-6')}>
        <Field label="Title">
          <input
            value={values.title}
            onChange={(event) => set('title', event.target.value)}
            className={clsx(fieldClass, 'text-base font-bold')}
          />
        </Field>

        <div className={clsx('grid gap-4', 'md:grid-cols-2')}>
          <Field label="Caption" hint="Small chip above the title.">
            <TextInput
              value={values.caption}
              onChange={(v) => set('caption', v)}
            />
          </Field>
          <Field label="Mascot">
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

        <Field label="Description" hint="Under the title, and in meta tags.">
          <TextArea
            value={values.description}
            onChange={(v) => set('description', v)}
          />
        </Field>
      </section>

      <MarkdownField
        value={values.body}
        onChange={(body) => set('body', body)}
        rows={28}
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
          disabled={pending}
          onClick={save}
          className={clsx(
            'border-ink bg-ink text-paper shadow-brutal panel-interactive border-[3px] px-5 py-2 font-mono text-[11px] font-bold tracking-[0.08em] uppercase disabled:pointer-events-none disabled:opacity-50'
          )}
        >
          {pending ? 'Saving…' : 'Save page'}
        </button>
        <a
          href={route}
          target="_blank"
          rel="noreferrer"
          className={clsx(
            'text-ink-soft ml-auto font-mono text-[11px] uppercase underline'
          )}
        >
          View live ↗
        </a>
      </div>
    </div>
  );
}
