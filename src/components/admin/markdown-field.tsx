'use client';

import clsx from 'clsx';
import { useRef, useState } from 'react';

import { Markdown } from '@/components/markdown';

import type { ClipboardEvent, DragEvent, ReactNode } from 'react';

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
  {
    label: 'Table',
    before: '| A | B |\n| - | - |\n| ',
    after: ' |  |',
    placeholder: 'cell',
  },
  { label: 'Rule', before: '\n---\n', after: '', placeholder: '' },
];

/**
 * Markdown editing surface shared by the post, project and page editors:
 * toolbar, live preview, and image upload by paste or drop.
 */
export function MarkdownField({
  value,
  onChange,
  rows = 24,
  extraToolbar,
  onError,
  onMessage,
}: {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  /** Slot for editor-specific buttons, e.g. the post importer. */
  extraToolbar?: ReactNode;
  onError?: (message: string) => void;
  onMessage?: (message: string) => void;
}) {
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  /** Wraps the current selection, then restores the caret around it. */
  const insert = (snippet: Snippet) => {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value: current } = textarea;
    const selected = current.slice(selectionStart, selectionEnd);
    const content = selected || snippet.placeholder;

    onChange(
      current.slice(0, selectionStart) +
        snippet.before +
        content +
        snippet.after +
        current.slice(selectionEnd)
    );

    const caret = selectionStart + snippet.before.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(caret, caret + content.length);
    });
  };

  const insertAtCaret = (text: string) => {
    const textarea = bodyRef.current;

    if (!textarea) {
      onChange(`${value}\n${text}\n`);
      return;
    }

    const { selectionStart, selectionEnd, value: current } = textarea;
    onChange(
      current.slice(0, selectionStart) + text + current.slice(selectionEnd)
    );
  };

  const uploadFiles = async (files: File[]) => {
    const images = files.filter((file) => file.type.startsWith('image/'));
    if (images.length === 0) return;

    setUploading(true);

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
          error?: string;
        };

        if (!response.ok || !data.markdown) {
          throw new Error(data.error ?? 'Upload failed.');
        }

        insertAtCaret(`\n${data.markdown}\n`);
        onMessage?.(`Uploaded ${file.name}`);
      }
    } catch (uploadError) {
      onError?.(
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

  return (
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
          {extraToolbar}
          <button
            type="button"
            onClick={() => setPreview((current) => !current)}
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
          <Markdown source={value || '_Nothing to preview yet._'} />
        </div>
      ) : (
        <textarea
          ref={bodyRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onPaste={onPaste}
          onDrop={onDrop}
          rows={rows}
          spellCheck
          placeholder="Write in markdown. Paste or drop an image to upload it straight to R2."
          className={clsx(
            'border-ink bg-paper text-ink w-full resize-y border-[3px] px-3 py-2 font-mono text-sm leading-relaxed'
          )}
        />
      )}

      <p className={clsx('text-ink-soft mt-3 font-mono text-[11px]')}>
        {uploading
          ? 'Uploading image…'
          : 'Paste or drop images anywhere in the body to upload them to R2.'}
      </p>
    </div>
  );
}
