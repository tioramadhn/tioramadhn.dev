import clsx from 'clsx';
import { redirect } from 'next/navigation';

import { Mascot } from '@/components/mascot';

import { isAuthenticated } from '@/lib/auth';

import { LoginForm } from './login-form';

export default async function LoginPage() {
  if (await isAuthenticated()) {
    redirect('/admin');
  }

  return (
    <div className={clsx('mx-auto max-w-md')}>
      <Mascot expression="locked" size={180} className={clsx('mx-auto')} />
      <h1 className={clsx('display-text mb-2 text-3xl')}>Sign in</h1>
      <p className={clsx('text-ink-soft mb-8 text-sm')}>
        One password, stored as a Worker secret. Sessions last seven days.
      </p>
      <LoginForm />
    </div>
  );
}
