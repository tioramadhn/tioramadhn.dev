import clsx from 'clsx';

import { Container, PageHeader } from '@/components/ui';

import type { MascotExpression } from '@/lib/mascot';
import type { ReactNode } from 'react';

export interface PageMeta {
  title: string;
  description: string;
  caption?: string;
}

/** Shell shared by every hand-written MDX content page. */
export function MdxPage({
  meta,
  mascot,
  children,
}: {
  meta: PageMeta;
  mascot?: MascotExpression;
  children: ReactNode;
}) {
  return (
    <Container className={clsx('py-14', 'md:py-20')}>
      <PageHeader
        caption={meta.caption}
        title={meta.title}
        description={meta.description}
        mascot={mascot}
      />
      <div className={clsx('prose-brutal')}>{children}</div>
    </Container>
  );
}
