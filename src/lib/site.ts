export const site = {
  name: 'Tio Ramadhan',
  handle: 'tioramadhn',
  role: 'Frontend Engineer',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tioramadhn.com',
  email: 'tioramadhan9f@gmail.com',
  location: 'Jakarta, Indonesia',
  timezone: 'GMT+7',
  description:
    'Frontend Engineer building production web applications for fintech and AI products — design systems, micro-frontend architecture, and seamless user experiences.',
  resume: '/assets/CV_Tio Ramadhan.pdf',
  openToWork: true,
} as const;

export const nav = [
  { href: '/projects', label: 'Projects' },
  { href: '/blog', label: 'Blog' },
  { href: '/work/experience', label: 'Experience' },
  { href: '/work/skills-and-tools', label: 'Skills' },
  { href: '/work/contact', label: 'Contact' },
] as const;

export const socials = [
  { label: 'GitHub', href: 'https://github.com/tioramadhn' },
  { label: 'LinkedIn', href: 'https://linkedin.com/in/tioramadhn' },
  { label: 'Instagram', href: 'https://instagram.com/tioramadhn' },
] as const;

export function absoluteUrl(path: string) {
  return new URL(path, site.url).toString();
}
