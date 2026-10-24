'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  deleteProjectAction,
  moveProjectAction,
} from '@/app/admin/content-actions';

const buttonClass =
  'border-ink bg-paper-raised border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase hover:bg-lime hover:text-[#11100f] disabled:pointer-events-none disabled:opacity-40';

export function ProjectRowActions({
  slug,
  isFirst,
  isLast,
}: {
  slug: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const run = (action: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      await action();
      setConfirming(false);
      router.refresh();
    });

  return (
    <div className={clsx('flex shrink-0 flex-wrap items-center gap-2')}>
      <button
        type="button"
        aria-label="Move up"
        disabled={isFirst || pending}
        onClick={() => run(() => moveProjectAction(slug, -1))}
        className={buttonClass}
      >
        ↑
      </button>
      <button
        type="button"
        aria-label="Move down"
        disabled={isLast || pending}
        onClick={() => run(() => moveProjectAction(slug, 1))}
        className={buttonClass}
      >
        ↓
      </button>

      <Link href={`/admin/projects/${slug}`} className={buttonClass}>
        Edit
      </Link>

      {confirming ? (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => deleteProjectAction(slug))}
            className={clsx(buttonClass, 'bg-coral text-[#11100f]')}
          >
            {pending ? 'Deleting…' : 'Confirm delete'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className={buttonClass}
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={buttonClass}
        >
          Delete
        </button>
      )}
    </div>
  );
}
