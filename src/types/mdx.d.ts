/**
 * Augments the `*.mdx` module declaration from `@types/mdx` (which only covers
 * the default export) with the `meta` object every content page exports, so
 * each page.tsx can read its own title/description without duplicating them.
 */
declare module '*.mdx' {
  export const meta: {
    title: string;
    description: string;
    caption?: string;
    slug?: string;
  };
}
