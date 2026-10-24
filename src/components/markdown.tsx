import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';

import type { Components } from 'react-markdown';

const components: Components = {
  a({ href, children, ...props }) {
    const isExternal = !!href && /^https?:\/\//.test(href);

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
  // Post images come from R2 via /media/*, already sized by the uploader, so a
  // plain <img> (with lazy loading) beats routing them through next/image.
  img({ src, alt, ...props }) {
    if (typeof src !== 'string') return null;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ''}
        loading="lazy"
        decoding="async"
        {...props}
      />
    );
  },
};

export function Markdown({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  return (
    <div className={clsx('prose-brutal', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
