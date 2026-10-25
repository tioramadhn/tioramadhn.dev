/**
 * highlight.js ships no Solidity grammar, and this package ships no types.
 * Only the two grammar functions are used — they are handed to rehype-highlight
 * rather than registered on a global hljs instance.
 */
declare module 'highlightjs-solidity' {
  import type { LanguageFn } from 'highlight.js';

  export const solidity: LanguageFn;
  export const yul: LanguageFn;
}
