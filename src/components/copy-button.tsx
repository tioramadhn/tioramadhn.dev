'use client';

import clsx from 'clsx';
import { useRef, useState } from 'react';

import type { ReactNode } from 'react';

function CopyIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="square"
      className={clsx('size-3.5')}
    >
      <rect x="9" y="9" width="11" height="11" />
      <path d="M5 15V5a1 1 0 0 1 1-1h9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="square"
      className={clsx('size-3.5')}
    >
      <path d="m4 12 6 6L20 6" />
    </svg>
  );
}

/**
 * Wraps a code block with a copy button. The text is read from the rendered
 * DOM at click time rather than from the markdown AST, so it copies exactly
 * what the reader sees, syntax highlighting spans and all.
 *
 * The button sits in the wrapper, not inside `<pre>`, because `pre` scrolls
 * horizontally and the button would slide away with long lines.
 */
export function CodeBlock({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    // A fenced block's textContent ends with the newline before the closing
    // fence. Harmless in a snippet, but a wallet address with a stray newline
    // is rejected by some wallets, so trailing blank lines go. Leading
    // indentation stays: it can be part of the code.
    const text = (
      ref.current?.querySelector('code')?.textContent ?? ''
    ).replace(/\n+$/, '');
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context, denied permission): the block is
      // still selectable by hand, so there is nothing to recover from.
    }
  };

  return (
    <div ref={ref} className={clsx('code-block')}>
      {children}
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy code'}
        className={clsx(
          'code-block-copy flex items-center gap-1.5 border-2 px-2 py-1',
          'font-mono text-[10px] font-bold tracking-[0.08em] uppercase',
          copied
            ? 'bg-lime border-lime text-[#11100f]'
            : 'border-code-ink/35 bg-code text-code-ink hover:bg-code-ink hover:text-code'
        )}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
