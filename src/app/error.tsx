'use client';

import clsx from 'clsx';

import { Mascot } from '@/components/mascot';
import { Button, ButtonLink, Container } from '@/components/ui';

/**
 * Catches render-time failures (a dead R2 binding being the likely one) so a
 * broken page degrades into something readable instead of a blank 500.
 */
export default function Error({ reset }: { reset: () => void }) {
  return (
    <Container className={clsx('py-20 text-center', 'md:py-28')}>
      <div className={clsx('flex flex-col items-center')}>
        <Mascot expression="burnedOut" size={220} />
        <h1 className={clsx('display-text mt-2 text-3xl', 'md:text-4xl')}>
          That broke
        </h1>
        <p className={clsx('text-ink-soft mt-4 max-w-md')}>
          Something failed while rendering this page. Trying again usually
          helps.
        </p>
        <div className={clsx('mt-8 flex flex-wrap justify-center gap-3')}>
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/" tone="outline">
            Back home
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
