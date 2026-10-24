'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { deletePostAction, setStatusAction } from './actions';

import type { PostStatus } from '@/lib/posts';

const buttonClass =
  'border-ink bg-paper-raised border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase hover:bg-lime hover:text-[#11100f] disabled:pointer-events-none disabled:opacity-50';

export function PostRowActions({
  slug,
  status,
}: {
  slug: string;
  status: PostStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const run = (action: () => Promise<{ error?: string }>) => {
    startTransition(async () => {
      await action();
      setConfirming(false);
      router.refresh();
    });
  };

  return (
    <div className={clsx('flex shrink-0 flex-wrap items-center gap-2')}>
      <Link href={`/admin/edit/${slug}`} className={buttonClass}>
        Edit
      </Link>

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(() =>
            setStatusAction(
              slug,
              status === 'published' ? 'draft' : 'published'
            )
          )
        }
        className={buttonClass}
      >
        {status === 'published' ? 'Unpublish' : 'Publish'}
      </button>

      {confirming ? (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => deletePostAction(slug))}
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
