'use client';

import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import { Markdown } from '@/components/markdown';
import { Mascot } from '@/components/mascot';

import { parseFrontMatter } from '@/lib/front-matter';
import { slugify } from '@/lib/markdown';

import { savePostAction } from '@/app/admin/actions';

import type { SavePostPayload } from '@/app/admin/actions';
import type { PostStatus } from '@/lib/posts';
import type { ChangeEvent, ClipboardEvent, DragEvent } from 'react';

export interface PostEditorValues {
  originalSlug: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string;
  cover: string;
  body: string;
  status: PostStatus;
}

const fieldClass =
  'border-ink bg-paper text-ink w-full border-[3px] px-3 py-2 font-mono text-sm';

const labelClass =
  'font-mono text-[11px] font-bold tracking-[0.08em] uppercase';

const toolbarButtonClass =
  'border-ink bg-paper-raised border-2 px-2 py-1 font-mono text-[11px] font-bold uppercase hover:bg-lime hover:text-[#11100f]';

interface Snippet {
  label: string;
  before: string;
  after: string;
  placeholder: string;
}

const snippets: Snippet[] = [
  { label: 'H2', before: '## ', after: '', placeholder: 'Heading' },
  { label: 'H3', before: '### ', after: '', placeholder: 'Heading' },
  { label: 'Bold', before: '**', after: '**', placeholder: 'bold text' },
  { label: 'Italic', before: '_', after: '_', placeholder: 'italic text' },
  { label: 'Link', before: '[', after: '](https://)', placeholder: 'label' },
  { label: 'Code', before: '`', after: '`', placeholder: 'code' },
  {
    label: 'Block',
    before: '```ts\n',
    after: '\n```',
    placeholder: 'const x = 1;',
  },
  { label: 'Quote', before: '> ', after: '', placeholder: 'quote' },
  { label: 'List', before: '- ', after: '', placeholder: 'item' },
  { label: 'Rule', before: '\n---\n', after: '', placeholder: '' },
];

export function PostEditor({ initial }: { initial: PostEditorValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [slugLocked, setSlugLocked] = useState(!!initial.originalSlug);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const set = <K extends keyof PostEditorValues>(
    key: K,
    value: PostEditorValues[K]
  ) => setValues((current) => ({ ...current, [key]: value }));

  const onTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const title = event.target.value;

    setValues((current) => ({
      ...current,
      title,
      // Keep the slug in step with the title until it is edited by hand.
      slug: slugLocked ? current.slug : slugify(title),
    }));
  };

  /** Inserts markdown around the current selection and restores the caret. */
  const insert = (snippet: Snippet) => {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.slice(selectionStart, selectionEnd);
    const content = selected || snippet.placeholder;
    const next =
      value.slice(0, selectionStart) +
      snippet.before +
      content +
      snippet.after +
      value.slice(selectionEnd);

    set('body', next);

    const caret = selectionStart + snippet.before.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(caret, caret + content.length);
    });
  };

  const insertAtCaret = (text: string) => {
    const textarea = bodyRef.current;

    if (!textarea) {
      setValues((current) => ({
        ...current,
        body: `${current.body}\n${text}\n`,
      }));
      return;
    }

    const { selectionStart, selectionEnd, value } = textarea;
    setValues((current) => ({
      ...current,
      body: value.slice(0, selectionStart) + text + value.slice(selectionEnd),
    }));
  };

  const uploadFiles = async (files: File[]) => {
    const images = files.filter((file) => file.type.startsWith('image/'));
    if (images.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (const file of images) {
        const form = new FormData();
        form.append('file', file);

        const response = await fetch('/api/media', {
          method: 'POST',
          body: form,
        });
        const data = (await response.json()) as {
          markdown?: string;
          url?: string;
          error?: string;
        };

        if (!response.ok || !data.markdown) {
          throw new Error(data.error ?? 'Upload failed.');
        }

        insertAtCaret(`\n${data.markdown}\n`);
        setMessage(`Uploaded ${file.name}`);
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'Upload failed.'
      );
    } finally {
      setUploading(false);
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files);
    if (files.length === 0) return;

    event.preventDefault();
    void uploadFiles(files);
  };

  const onDrop = (event: DragEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) return;

    event.preventDefault();
    void uploadFiles(files);
  };

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
      body,
    }));
    setSlugLocked(true);
    setMessage(`Imported ${file.name}. Review it, then save.`);
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
        <label className={clsx('flex flex-col gap-2')}>
          <span className={labelClass}>Title</span>
          <input
            value={values.title}
            onChange={onTitleChange}
            placeholder="What is this post about?"
            className={clsx(fieldClass, 'text-base font-bold')}
          />
        </label>

        <div className={clsx('grid gap-4', 'md:grid-cols-2')}>
          <label className={clsx('flex flex-col gap-2')}>
            <span className={labelClass}>Slug</span>
            <input
              value={values.slug}
              onChange={(event) => {
                setSlugLocked(true);
                set('slug', event.target.value);
              }}
              placeholder="post-url"
              className={fieldClass}
            />
            <span className={clsx('text-ink-soft font-mono text-[11px]')}>
              /blog/{values.slug || '…'}
            </span>
          </label>

          <label className={clsx('flex flex-col gap-2')}>
            <span className={labelClass}>Date</span>
            <input
              type="date"
              value={values.date}
              onChange={(event) => set('date', event.target.value)}
              className={fieldClass}
            />
          </label>
        </div>

        <label className={clsx('flex flex-col gap-2')}>
          <span className={labelClass}>Description</span>
          <textarea
            value={values.description}
            onChange={(event) => set('description', event.target.value)}
            rows={2}
            placeholder="One or two sentences for the post list and social cards."
            className={fieldClass}
          />
        </label>

        <div className={clsx('grid gap-4', 'md:grid-cols-2')}>
          <label className={clsx('flex flex-col gap-2')}>
            <span className={labelClass}>Tags</span>
            <input
              value={values.tags}
              onChange={(event) => set('tags', event.target.value)}
              placeholder="react, cloudflare, notes"
              className={fieldClass}
            />
            <span className={clsx('text-ink-soft font-mono text-[11px]')}>
              Comma separated, up to six.
            </span>
          </label>

          <label className={clsx('flex flex-col gap-2')}>
            <span className={labelClass}>Cover image</span>
            <div className={clsx('flex gap-2')}>
              <input
                value={values.cover}
                onChange={(event) => set('cover', event.target.value)}
                placeholder="/media/2026/10/cover.png"
                className={fieldClass}
              />
              <label
                className={clsx(
                  toolbarButtonClass,
                  'flex shrink-0 cursor-pointer items-center'
                )}
              >
                Upload
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;

                    setUploading(true);
                    setError(null);

                    try {
                      const form = new FormData();
                      form.append('file', file);

                      const response = await fetch('/api/media', {
                        method: 'POST',
                        body: form,
                      });
                      const data = (await response.json()) as {
                        url?: string;
                        error?: string;
                      };

                      if (!response.ok || !data.url) {
                        throw new Error(data.error ?? 'Upload failed.');
                      }

                      set('cover', data.url);
                      setMessage('Cover uploaded.');
                    } catch (uploadError) {
                      setError(
                        uploadError instanceof Error
                          ? uploadError.message
                          : 'Upload failed.'
                      );
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
              </label>
            </div>
          </label>
        </div>
      </div>

      <div className={clsx('panel p-6')}>
        <div
          className={clsx(
            'mb-3 flex flex-wrap items-center justify-between gap-3'
          )}
        >
          <div className={clsx('flex flex-wrap gap-1.5')}>
            {snippets.map((snippet) => (
              <button
                key={snippet.label}
                type="button"
                onClick={() => insert(snippet)}
                className={toolbarButtonClass}
              >
                {snippet.label}
              </button>
            ))}
          </div>

          <div className={clsx('flex gap-1.5')}>
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
            <button
              type="button"
              onClick={() => setPreview((value) => !value)}
              className={clsx(
                toolbarButtonClass,
                preview && 'bg-lime text-[#11100f]'
              )}
            >
              {preview ? 'Edit' : 'Preview'}
            </button>
          </div>
        </div>

        {preview ? (
          <div
            className={clsx(
              'border-ink bg-paper max-h-[32rem] overflow-y-auto border-[3px] p-5'
            )}
          >
            <Markdown source={values.body || '_Nothing to preview yet._'} />
          </div>
        ) : (
          <textarea
            ref={bodyRef}
            value={values.body}
            onChange={(event) => set('body', event.target.value)}
            onPaste={onPaste}
            onDrop={onDrop}
            rows={24}
            spellCheck
            placeholder="Write in markdown. Paste or drop an image to upload it straight to R2."
            className={clsx(fieldClass, 'resize-y leading-relaxed')}
          />
        )}

        <p className={clsx('text-ink-soft mt-3 font-mono text-[11px]')}>
          {uploading
            ? 'Uploading image…'
            : 'Paste or drop images anywhere in the body to upload them to R2.'}
        </p>
      </div>

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
