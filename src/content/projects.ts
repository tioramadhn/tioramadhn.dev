export interface Project {
  slug: string;
  title: string;
  caption: string;
  description: string;
  /** Tailwind background colour class for the card's panel. */
  accent: string;
  stack: string[];
  siteUrl?: string;
  cover?: string;
}

export const projects: Project[] = [
  {
    slug: 'octo-cimb-niaga',
    title: 'OCTO by CIMB Niaga',
    caption: 'Banking Platform',
    description:
      'Platform revamp work on an 11-service micro-frontend banking platform — design-system ownership in the shared UIKit, three legacy domain migrations, WhatsApp OTP, the config-driven form engine, and the typed API layer.',
    accent: 'bg-brand',
    stack: ['React', 'TypeScript', 'Module Federation', 'Design System'],
  },
  {
    slug: 'som-ai',
    title: 'SOM AI',
    caption: 'Web Development',
    description:
      'A full-stack AI study assistant for thesis and academic research, grown to 200,000+ users with no paid marketing.',
    accent: 'bg-cyan',
    stack: ['Next.js', 'NestJS', 'OpenAI', 'Docker'],
    siteUrl: 'https://somai.id/',
    cover: '/assets/images/projects/somai-ui-cover.jpeg',
  },
  {
    slug: 'badr-web',
    title: 'Badr Web Redesign',
    caption: 'Web Development',
    description:
      'A redesigned portfolio site for Badr Interactive, a software house — modern UI and an SEO rebuild that took it to the top of Google.',
    accent: 'bg-amber',
    stack: ['WordPress', 'Elementor', 'SEO', 'UI Design'],
    siteUrl: 'https://badr.co.id/',
    cover: '/assets/images/projects/badr.png',
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
