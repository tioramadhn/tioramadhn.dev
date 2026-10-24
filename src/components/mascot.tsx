'use client';

import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

import { MASCOT_ALT, mascotSrc } from '@/lib/mascot';

import type { MascotExpression } from '@/lib/mascot';
import type { AnimationItem } from 'lottie-web';

type PlayMode = 'loop' | 'once' | 'hover';

interface MascotProps {
  expression: MascotExpression;
  /** Rendered box, in px. The art is square, so this is width and height. */
  size?: number;
  play?: PlayMode;
  className?: string;
  /** Flip horizontally — handy when the mascot sits on the other side. */
  flip?: boolean;
}

/**
 * Plays one sticker from the mascot set.
 *
 * The animation only loads once the element is near the viewport, and both the
 * player (~164KB) and the sticker JSON (~85-240KB) are fetched at that point,
 * so nothing here is in the initial bundle or blocks first paint. The box is
 * sized up front, so there is no layout shift when it arrives.
 */
export function Mascot({
  expression,
  size = 180,
  play = 'loop',
  className,
  flip = false,
}: MascotProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const [visible, setVisible] = useState(false);

  // Only start loading when the mascot is actually about to be seen.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (typeof IntersectionObserver === 'undefined') {
      // Defensive fallback: load it anyway, but out of the effect body so the
      // render pass is not driving a state update.
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;

    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    void (async () => {
      try {
        const [{ default: lottie }, response] = await Promise.all([
          import('lottie-web/build/player/esm/lottie_light.min.js'),
          fetch(mascotSrc(expression)),
        ]);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const animationData: unknown = await response.json();
        if (cancelled) return;

        const animation = lottie.loadAnimation({
          container: host,
          renderer: 'svg',
          // Reduced motion still gets the artwork, just held on frame one.
          loop: play === 'loop' && !reduceMotion,
          autoplay: play !== 'hover' && !reduceMotion,
          animationData,
          rendererSettings: { progressiveLoad: true },
        });

        animationRef.current = animation;

        if (reduceMotion) animation.goToAndStop(0, true);
      } catch {
        // A missing or malformed sticker should never take the page with it;
        // the surrounding layout simply keeps its reserved space.
      }
    })();

    return () => {
      cancelled = true;
      animationRef.current?.destroy();
      animationRef.current = null;
    };
  }, [visible, expression, play]);

  const hoverHandlers =
    play === 'hover'
      ? {
          onMouseEnter: () => animationRef.current?.goToAndPlay(0, true),
          onFocus: () => animationRef.current?.goToAndPlay(0, true),
        }
      : undefined;

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={MASCOT_ALT[expression]}
      className={clsx('shrink-0', flip && '-scale-x-100', className)}
      style={{ width: size, height: size }}
      {...hoverHandlers}
    />
  );
}
