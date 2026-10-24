'use client';

import clsx from 'clsx';
import { useActionState } from 'react';

import { login } from '../actions';

import type { ActionResult } from '../actions';

const initialState: ActionResult = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className={clsx('panel flex flex-col gap-4 p-6')}>
      <label className={clsx('flex flex-col gap-2')}>
        <span
          className={clsx(
            'font-mono text-[11px] font-bold tracking-[0.08em] uppercase'
          )}
        >
          Admin password
        </span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className={clsx(
            'border-ink bg-paper text-ink border-[3px] px-3 py-2.5 font-mono text-sm'
          )}
        />
      </label>

      {state.error ? (
        <p
          className={clsx(
            'border-ink bg-coral border-2 px-3 py-2 font-mono text-xs text-[#11100f]'
          )}
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={clsx(
          'border-ink bg-ink text-paper shadow-brutal panel-interactive border-[3px] px-5 py-2.5 font-mono text-xs font-bold tracking-[0.08em] uppercase disabled:pointer-events-none disabled:opacity-50'
        )}
      >
        {pending ? 'Checking…' : 'Sign in'}
      </button>
    </form>
  );
}
