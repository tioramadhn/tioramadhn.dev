import clsx from 'clsx';

import { Markdown } from '@/components/markdown';
import { Container, PageHeader } from '@/components/ui';

import type { ReactNode } from 'react';
import type { MascotExpression } from '@/lib/mascot';

/**
 * Shell for every long-form page — the work pages, credits, and project
 * write-ups. All of them are markdown now, whether it came from R2 or the
 * built-in defaults.
 */
export function ContentPage({
  caption,
  title,
  description,
  mascot,
  body,
  children,
}: {
  caption?: string;
  title: string;
  description?: string;
  mascot?: MascotExpression;
  body: string;
  children?: ReactNode;
}) {
  return (
    <Container className={clsx('py-14', 'md:py-20')}>
      <PageHeader
        caption={caption || undefined}
        title={title}
        description={description}
        mascot={mascot}
      />
      {children}
      <Markdown source={body} />
    </Container>
  );
}
