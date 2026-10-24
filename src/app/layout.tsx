import { Archivo_Black, JetBrains_Mono, Space_Grotesk } from 'next/font/google';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { themeInitScript } from '@/components/theme-toggle';

import { site } from '@/lib/site';

import type { Metadata, Viewport } from 'next';

import './globals.css';

const display = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-archivo-black',
  display: 'swap',
});

const sans = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} · ${site.role}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: 'website',
    siteName: site.name,
    url: site.url,
    title: `${site.name} · ${site.role}`,
    description: site.description,
    images: ['/assets/images/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    creator: `@${site.handle}`,
  },
  alternates: {
    types: { 'application/rss+xml': '/rss.xml' },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fdf7e9' },
    { media: '(prefers-color-scheme: dark)', color: '#15141a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <head>
        {/* Applies the stored theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <a
          href="#main"
          className="focus:border-ink focus:bg-lime sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:border-[3px] focus:px-3 focus:py-2 focus:font-mono focus:text-xs focus:text-[#11100f]"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
