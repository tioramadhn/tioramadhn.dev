import clsx from 'clsx';
import Link from 'next/link';

import { Mascot } from '@/components/mascot';

import type { MascotExpression } from '@/lib/mascot';
import type { ComponentProps, ReactNode } from 'react';

type ButtonTone = 'solid' | 'outline' | 'accent';

const toneClass: Record<ButtonTone, string> = {
  solid: 'bg-ink text-paper',
  outline: 'bg-paper-raised text-ink',
  accent: 'bg-lime text-[#11100f]',
};

const buttonBase =
  'inline-flex items-center justify-center gap-2 border-[3px] border-ink px-5 py-2.5 font-mono text-xs font-bold tracking-[0.08em] uppercase shadow-brutal panel-interactive disabled:pointer-events-none disabled:opacity-50';

export function Button({
  tone = 'solid',
  className,
  ...props
}: ComponentProps<'button'> & { tone?: ButtonTone }) {
  return (
    <button
      type="button"
      className={clsx(buttonBase, toneClass[tone], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  tone = 'solid',
  className,
  external = false,
  href,
  children,
  ...props
}: Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string;
  tone?: ButtonTone;
  external?: boolean;
}) {
  const classes = clsx(buttonBase, toneClass[tone], className);

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}

export function Chip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={clsx('label-chip', className)}>{children}</span>;
}

export function SectionHeading({
  caption,
  title,
  children,
}: {
  caption: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={clsx('mb-8 flex flex-col gap-3')}>
      <Chip className={clsx('bg-pink w-fit text-[#11100f]')}>{caption}</Chip>
      <h2 className={clsx('display-text text-3xl', 'md:text-4xl')}>{title}</h2>
      {children ? (
        <p className={clsx('text-ink-soft max-w-2xl text-base')}>{children}</p>
      ) : null}
    </div>
  );
}

/** Page-level title block, shared by every inner page. */
export function PageHeader({
  caption,
  title,
  description,
  mascot,
  children,
}: {
  caption?: string;
  title: string;
  description?: string;
  mascot?: MascotExpression;
  children?: ReactNode;
}) {
  return (
    <header
      className={clsx('border-ink mb-10 border-b-[3px] pb-8', 'md:mb-14')}
    >
      <div
        className={clsx(
          'flex flex-col gap-6',
          'sm:flex-row sm:items-center sm:justify-between sm:gap-8'
        )}
      >
        <div className={clsx('min-w-0 flex-1')}>
          {caption ? (
            <Chip className={clsx('bg-lime mb-4 text-[#11100f]')}>
              {caption}
            </Chip>
          ) : null}
          <h1
            className={clsx(
              'display-text text-4xl break-words',
              'sm:text-5xl md:text-6xl'
            )}
          >
            {title}
          </h1>
          {description ? (
            <p className={clsx('text-ink-soft mt-5 max-w-2xl text-lg')}>
              {description}
            </p>
          ) : null}
        </div>

        {mascot ? (
          <Mascot
            expression={mascot}
            size={160}
            className={clsx('-my-6 self-start', 'sm:-my-10 sm:self-center')}
          />
        ) : null}
      </div>
      {children}
    </header>
  );
}

export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx('mx-auto w-full max-w-5xl px-5', 'md:px-8', className)}
    >
      {children}
    </div>
  );
}
