/**
 * Structural constants only. Everything a visitor reads — name, role, bio,
 * socials, CV link — is editable content and lives in `@/lib/content`.
 */
export const site = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tioramadhn.com',
} as const;

/** Navigation maps to routes, so it is code rather than content. */
export const nav = [
  { href: '/projects', label: 'Projects' },
  { href: '/blog', label: 'Blog' },
  { href: '/work/experience', label: 'Experience' },
  { href: '/work/skills-and-tools', label: 'Skills' },
  { href: '/work/contact', label: 'Contact' },
] as const;

export function absoluteUrl(path: string) {
  return new URL(path, site.url).toString();
}
