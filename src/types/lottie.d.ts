/**
 * The ESM light build ships no types of its own. It is the SVG renderer with
 * expressions compiled out, which is all this site needs — and it means the
 * sticker JSON can never execute script.
 */
declare module 'lottie-web/build/player/esm/lottie_light.min.js' {
  import type { AnimationItem, AnimationConfigWithData } from 'lottie-web';

  const lottie: {
    loadAnimation(params: AnimationConfigWithData): AnimationItem;
  };

  export default lottie;
}
