'use client';

import clsx from 'clsx';

import type { ReactNode } from 'react';

export const fieldClass =
  'border-ink bg-paper text-ink w-full border-[3px] px-3 py-2 font-mono text-sm';

export const labelClass =
  'font-mono text-[11px] font-bold tracking-[0.08em] uppercase';

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className={clsx('flex flex-col gap-2')}>
      <span className={labelClass}>{label}</span>
      {children}
      {hint ? (
        <span className={clsx('text-ink-soft font-mono text-[11px]')}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={fieldClass}
    />
  );
}

export function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={fieldClass}
    />
  );
}

export function StatusBanner({
  error,
  message,
}: {
  error?: string | null;
  message?: string | null;
}) {
  if (error) {
    return (
      <p
        className={clsx(
          'border-ink bg-coral border-[3px] px-4 py-3 font-mono text-xs text-[#11100f]'
        )}
      >
        {error}
      </p>
    );
  }

  if (message) {
    return (
      <p
        className={clsx(
          'border-ink bg-lime border-[3px] px-4 py-3 font-mono text-xs text-[#11100f]'
        )}
      >
        {message}
      </p>
    );
  }

  return null;
}
