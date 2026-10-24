import clsx from 'clsx';

import type { MDXComponents } from 'mdx/types';

/**
 * Global MDX components for the hand-written content pages. The long-form
 * typography itself is handled by the `.prose-brutal` wrapper each page puts
 * around its content, so this file only adds what markdown cannot express.
 */
const components: MDXComponents = {
  a: ({ href, children, ...props }) => {
    const isExternal = typeof href === 'string' && /^https?:\/\//.test(href);

    return (
      <a
        href={href}
        {...(isExternal
          ? { target: '_blank', rel: 'noreferrer noopener' }
          : {})}
        {...props}
      >
        {children}
      </a>
    );
  },
  // Used by the project pages for screenshots and screen recordings.
  Video: ({ src, caption }: { src: string; caption?: string }) => (
    <figure>
      <video src={src} autoPlay loop muted playsInline />
      {caption ? (
        <figcaption
          className={clsx('text-ink-soft mt-2 font-mono text-[11px] uppercase')}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  ),
  Figure: ({
    src,
    alt,
    caption,
  }: {
    src: string;
    alt: string;
    caption?: string;
  }) => (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" decoding="async" />
      {caption ? (
        <figcaption
          className={clsx('text-ink-soft mt-2 font-mono text-[11px] uppercase')}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
