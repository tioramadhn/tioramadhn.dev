import type { MascotExpression } from '@/lib/mascot';

export interface SocialLink {
  label: string;
  href: string;
}

export interface Highlight {
  label: string;
  title: string;
  detail: string;
}

export interface Profile {
  name: string;
  handle: string;
  role: string;
  email: string;
  location: string;
  timezone: string;
  /** Meta description used for SEO and social cards. */
  description: string;
  openToWork: boolean;
  /** Path to the CV — a /files/... upload, or anything under /assets. */
  resumeUrl: string;
}

export interface Hero {
  /** A newline becomes a line break in the big display heading. */
  headline: string;
  /** Follows the highlighted role in the opening paragraph. */
  intro: string;
  ctaTitle: string;
  ctaBody: string;
}

export interface SiteSettings {
  profile: Profile;
  hero: Hero;
  stack: string[];
  highlights: Highlight[];
  socials: SocialLink[];
}

export interface ProjectRecord {
  slug: string;
  order: number;
  title: string;
  caption: string;
  /** Card blurb on the homepage and /projects. */
  description: string;
  /** Page subtitle on the project's own page. */
  summary: string;
  /** Tailwind background class used when there is no cover image. */
  accent: string;
  stack: string[];
  siteUrl: string;
  cover: string;
  /**
   * How the cover fills the card. Screenshots want `cover`; wordmarks and
   * logos want `contain`, which also gets a light backdrop so they stay
   * readable in dark mode.
   */
  coverFit: 'cover' | 'contain';
  mascot: MascotExpression;
  body: string;
}

export const PAGE_SLUGS = [
  'experience',
  'skills-and-tools',
  'contact',
  'credits',
] as const;

export type PageSlug = (typeof PAGE_SLUGS)[number];

export interface PageRecord {
  slug: string;
  title: string;
  description: string;
  caption: string;
  mascot: MascotExpression;
  body: string;
}

export const ACCENT_CHOICES = [
  'bg-brand',
  'bg-lime',
  'bg-pink',
  'bg-cyan',
  'bg-amber',
  'bg-coral',
] as const;
