import { ImageResponse } from 'next/og';

import { readAsset } from '@/lib/env';

const PAPER = '#fdf7e9';
const INK = '#11100f';
const LIME = '#c6f24e';

const DISPLAY = 'Archivo Black';

export interface OgCard {
  /** Small chip above the title: the series position, or a tag. */
  label: string;
  title: string;
  /** Bottom-right note, e.g. reading time. */
  note: string;
}

/**
 * The shared social card. Rendering runs on every request, so the caller's
 * cache headers matter more than the markup — see the routes that use it.
 *
 * Archivo Black is read through the assets binding rather than bundled, so the
 * display face costs nothing against the Worker size limit. It ships a single
 * weight, which is why nothing here sets `fontWeight`.
 */
export async function renderOgCard({
  label,
  title,
  note,
}: OgCard): Promise<ImageResponse> {
  const display = await readAsset('/fonts/ArchivoBlack-Regular.ttf');

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: PAPER,
        border: `16px solid ${INK}`,
        padding: '56px 64px',
      }}
    >
      <div style={{ display: 'flex' }}>
        <div
          style={{
            display: 'flex',
            background: LIME,
            border: `5px solid ${INK}`,
            color: INK,
            fontFamily: DISPLAY,
            fontSize: 24,
            padding: '12px 20px',
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}
        >
          {label}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          fontFamily: DISPLAY,
          fontSize: title.length > 70 ? 58 : 76,
          color: INK,
          lineHeight: 1.1,
          letterSpacing: -2,
        }}
      >
        {title}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderTop: `5px solid ${INK}`,
          paddingTop: 24,
          color: INK,
          fontSize: 28,
        }}
      >
        <div style={{ display: 'flex', fontFamily: DISPLAY }}>
          tioramadhn.com
        </div>
        <div style={{ display: 'flex' }}>{note}</div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [{ name: DISPLAY, data: display, style: 'normal' }],
      headers: {
        // Rendering is CPU-heavy and the card only changes when the post does.
        'cache-control': 'public, max-age=3600, s-maxage=86400',
      },
    }
  );
}
