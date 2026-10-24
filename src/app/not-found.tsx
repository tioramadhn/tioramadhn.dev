import clsx from 'clsx';

import { Mascot } from '@/components/mascot';
import { ButtonLink, Container } from '@/components/ui';

export default function NotFound() {
  return (
    <Container className={clsx('py-20 text-center', 'md:py-28')}>
      <div className={clsx('flex flex-col items-center')}>
        <Mascot expression="confused" size={220} />
        <p
          className={clsx(
            'display-text text-brand -mt-2 text-7xl',
            'md:text-8xl'
          )}
        >
          404
        </p>
        <h1 className={clsx('display-text mt-4 text-3xl')}>Page not found</h1>
        <p className={clsx('text-ink-soft mt-4 max-w-md')}>
          That URL does not exist — it may have moved when the site was rebuilt.
        </p>
        <div className={clsx('mt-8 flex flex-wrap justify-center gap-3')}>
          <ButtonLink href="/">Back home</ButtonLink>
          <ButtonLink href="/blog" tone="outline">
            Blog
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
