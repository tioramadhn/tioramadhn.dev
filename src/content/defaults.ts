/**
 * Built-in content. Everything here is what the site shows before anything has
 * been edited in /admin — the R2 copy, when it exists, is layered on top. That
 * means a fresh deploy renders the real site rather than an empty shell, and
 * there is no migration step to run.
 */
import type {
  ProjectRecord,
  PageRecord,
  SiteSettings,
} from '@/lib/content-types';

export const DEFAULT_SETTINGS: SiteSettings = {
  profile: {
    name: 'Tio Ramadhan',
    handle: 'tioramadhn',
    role: 'Frontend Engineer',
    email: 'tioramadhan9f@gmail.com',
    location: 'Jakarta, Indonesia',
    timezone: 'GMT+7',
    description:
      'Frontend Engineer building production web applications for fintech and AI products \u2014 design systems, micro-frontend architecture, and seamless user experiences.',
    openToWork: true,
    resumeUrl: '/assets/CV_Tio Ramadhan.pdf',
  },
  hero: {
    headline: 'Tio\nRamadhan',
    intro:
      'building production apps for fintech and AI. I turn complex banking flows into interfaces that feel obvious \u2014 design systems, micro-frontends, and the shared plumbing eleven teams rely on.',
    ctaTitle: 'Got something to build?',
    ctaBody:
      'I am open to frontend and full-stack work. Tell me what you are working on.',
  },
  stack: [
    'TypeScript',
    'React',
    'Next.js',
    'Tailwind CSS',
    'TanStack Query',
    'Module Federation',
    'Cloudflare Workers',
  ],
  highlights: [
    {
      label: 'Now',
      title: 'Frontend Web Developer',
      detail: 'PT Bank CIMB Niaga \u2014 OCTO platform revamp, Jakarta',
    },
    {
      label: 'Scale',
      title: '11 services, ~30 engineers',
      detail: 'Micro-frontend banking platform, shared UIKit and form engine',
    },
    {
      label: 'Reach',
      title: '200,000+ users',
      detail: 'SOM AI grew with no paid marketing',
    },
  ],
  socials: [
    {
      label: 'GitHub',
      href: 'https://github.com/tioramadhn',
    },
    {
      label: 'LinkedIn',
      href: 'https://linkedin.com/in/tioramadhn',
    },
    {
      label: 'Instagram',
      href: 'https://instagram.com/tioramadhn',
    },
  ],
};

export const DEFAULT_PROJECTS: ProjectRecord[] = [
  {
    slug: 'octo-cimb-niaga',
    order: 0,
    title: 'OCTO by CIMB Niaga',
    caption: 'Banking Platform',
    mascot: 'monitoring',
    description:
      'Platform revamp work on an 11-service micro-frontend banking platform \u2014 design-system ownership in the shared UIKit, three legacy domain migrations, WhatsApp OTP, the config-driven form engine, and the typed API layer.',
    accent: 'bg-brand',
    stack: ['React', 'TypeScript', 'Module Federation', 'Design System'],
    siteUrl: '',
    cover: '/assets/images/projects/octo-cimb-niaga.jpg',
    coverFit: 'cover',
    summary:
      'Design system, domain migrations, and shared infrastructure on an 11-service micro-frontend banking platform.',
    body: `## Overview

**OCTO by CIMB Niaga** is the bank's digital banking platform. I joined the platform revamp team, which is rebuilding the legacy banking web app as a micro-frontend architecture: **11 independently deployable services** behind a single app shell, built by around **30 engineers**.

My work sits in the shared layer — the internal component library, the typed API package, and the form engine that every transactional journey runs on — plus frontend delivery for three of the migrated domains.

**Role**: Frontend Web Developer (On-site, Jakarta)  
**Duration**: February 2025 – Present

---

## Design System and Shared Widgets

I own component API design and implementation in the internal **UIKit** consumed by all 11 services.

- **Receipt widget** (~1,450 lines): the confirmation surface shared by transfer, payment, investment, and settings — one component covering every transaction type's receipt layout, status states, and actions.
- **Consent Dialog** (~900 lines): a regulatory consent flow used across the platform.
- **Form and overlay primitives**: Autocomplete, Select, Table, Stepper, Input/PIN, Dialog, and Popover.
- **46 Storybook stories** with **MSW**-based API mocking, so every widget can be developed and reviewed without a running backend.

The hard part of shared components in a large org is not the rendering — it is designing an API that eleven teams can adopt without forking it. Most of my time here goes into prop surface and composition boundaries.

---

## Legacy Platform Migration

I delivered the frontend for moving three major domains off the legacy banking web app:

- **Settings**: card management, BI-FAST alias lifecycle, security and personal settings — roughly **25 transaction flows**.
- **Online Registration**: savings account and credit card onboarding.
- **Investment**: mutual funds, bonds, and government retail bonds (SBN).

I also built **My Account** transaction history and mutation detail views for CASA and credit card accounts.

---

## WhatsApp OTP Verification

I led end-to-end delivery of OTP verification over WhatsApp, from first product to platform-wide rollout.

- Shipped first across **five Transfer products**, then rolled out to apply, payment, and registration.
- Rebuilt the shared OTP component into composable parts, cutting it down by **~40%**.
- Extended the OTP query and model layer to carry the new delivery channel.
- Gated the rollout behind **Flagr** feature flags with per-service payload and OTP-type routing, so each service could be switched on independently — the rollout completed with no incidents.

---

## Config-Driven Form Engine

Every transactional journey on the platform runs on a shared lifecycle form engine built on **json-logic** rules with **Vest** validation. I extended it with:

- **Form-value-driven conditional steps**, so a journey's shape can depend on what the user has already entered.
- **MFA step overrides** per journey.
- **Per-step OTP parameter overrides**.

Each of these replaced logic that services had been duplicating locally with declarative configuration in one place.

---

## Shared API Layer

I authored typed endpoints, request/response models, and **React Query** hooks in the shared service package across the payment, settings, registration, investment, and transfer domains.

While building it out I drove the request/response naming convention that was later adopted codebase-wide.

---

## Micro-Frontend Delivery

I scaffolded and shipped two services end-to-end, **Payment** and **Investment**:

- **Vite** and **Module Federation** build configuration.
- Multi-environment setup and **nginx** serving.
- Host registration in the app shell.

Both deploy independently of the other services, with no cross-module coupling.

---

## Tech Stack

React · TypeScript · Vite Module Federation · Turborepo · TanStack Router/Query · React Hook Form · Vest · Zod · Tailwind CSS · Radix UI · Storybook · MSW · Flagr · Tolgee/i18next · Biome`,
  },
  {
    slug: 'som-ai',
    order: 1,
    title: 'SOM AI',
    caption: 'Web Development',
    mascot: 'focused',
    description:
      'A full-stack AI study assistant for thesis and academic research, grown to 200,000+ users with no paid marketing.',
    accent: 'bg-cyan',
    stack: ['Next.js', 'NestJS', 'OpenAI', 'Docker'],
    siteUrl: 'https://somai.id/',
    cover: '/assets/images/projects/somai-ui-cover.jpeg',
    coverFit: 'cover',
    summary:
      'A full-stack AI study assistant for thesis and academic research, grown to 200,000+ users.',
    body: `## Overview

![SOM AI chat interface](/assets/images/projects/som-ai-video.webm)

SOM AI is an AI-supported chatbot built specifically to help students with their
thesis and college assignments. It makes working with an intelligent assistant
feel like part of the writing process rather than a separate tool.

**Role**: Full Stack Web Developer (Remote)  
**Duration**: September – October 2023

---

## Key Features

- **AI-powered chat completion**: real-time, AI-driven responses to academic queries.
- **Chat history storage**: users can revisit previous conversations for continued reference.
- **Bibliography search**: a quick search for sources and references.
- **Subscription-based access**: integrated with the Mayar payment gateway to manage premium subscriptions.

---

## Technologies Used

- **OpenAI**: the core engine powering the chatbot's intelligence.
- **Next.js & NestJS**: frontend and backend of the application.
- **Docker**: deployment and scaling of the platform.

---

## Impact

SOM AI reached **200,000+ users with no paid marketing**, becoming a genuinely
useful tool for students navigating academic work.`,
  },
  {
    slug: 'badr-web',
    order: 2,
    title: 'Badr Web Redesign',
    caption: 'Web Development',
    mascot: 'surprised',
    description:
      'A redesigned portfolio site for Badr Interactive, a software house \u2014 modern UI and an SEO rebuild that took it to the top of Google.',
    accent: 'bg-amber',
    stack: ['WordPress', 'Elementor', 'SEO', 'UI Design'],
    siteUrl: 'https://badr.co.id/',
    cover: '/assets/images/projects/badr.png',
    coverFit: 'cover',
    summary:
      'A redesigned portfolio site for Badr Interactive, with an SEO rebuild that took it to the top of Google.',
    body: `## Overview

![Badr website before the redesign](/assets/images/projects/badr-preview-before.webp "Before")

![Badr website after the redesign](/assets/images/projects/badr-preview-after.webp "After")

The Badr web redesign set out to rebuild the site around a fresh, modern UI from
Figma designs while improving its visibility through SEO. The redesign led to
real business growth by putting the site at the top of Google search results.

**Role**: Web Developer (Remote)  
**Duration**: March – April 2023

---

## Key Features

- **Modern UI design**: reworked the interface into something sleek and intuitive that makes the company's work easy to read.
- **SEO optimization**: reached the top spot in Google search results, driving significant traffic.
- **Effortless content management**: built on **WordPress** with the **Elementor** plugin so the team can update content without a developer.

---

## Technologies Used

- **WordPress**: structure and functionality of the site.
- **Elementor**: designing and customizing the UI from the provided Figma designs.

---

## Impact

The redesign improved more than the look of the site — it increased visibility,
which translated into more traffic and more inbound business.`,
  },
];

export const DEFAULT_PAGES: PageRecord[] = [
  {
    slug: 'experience',
    title: 'Experience',
    description:
      'Frontend engineer with 3+ years building production web applications in fintech and AI products.',
    caption: 'Work',
    mascot: 'goal',
    body: `Design systems, micro-frontend architecture, and Next.js full-stack development — mostly for products where a broken flow costs someone real money.

---

## PT Bank CIMB Niaga

**Frontend Web Developer** (February 2025 – Present) · _Jakarta, Indonesia_

On the platform revamp team behind **OCTO by CIMB Niaga**, an 11-service micro-frontend banking platform built by around 30 engineers.

- **Design system and shared widget ownership**: own component API design and implementation in the internal UIKit consumed by all 11 services — including the transaction **Receipt** widget (~1,450 lines, the confirmation surface for transfer, payment, investment, and settings) and a regulatory **Consent Dialog** (~900 lines) — alongside Autocomplete, Select, Table, Stepper, Input/PIN, Dialog, and Popover. Authored **46 Storybook stories** with **MSW**-based API mocking for isolated, backend-independent development.
- **Legacy platform migration**: delivered the frontend for migrating three major domains off the legacy banking web app — **Settings** (card management, BI-FAST alias lifecycle, security and personal settings; ~25 transaction flows), **Online Registration** (savings account and credit card onboarding), and **Investment** (mutual funds, bonds, and government retail bonds/SBN) — plus My Account transaction history and mutation detail views for CASA and credit card accounts.
- **WhatsApp OTP feature**: led end-to-end delivery of OTP verification via WhatsApp, shipped first across five Transfer products then rolled out to apply, payment, and registration. Rebuilt the shared OTP component into composable parts (**~40% smaller**) and gated delivery behind **Flagr** feature flags with per-service payload and OTP-type routing for a controlled, incident-free rollout.
- **Config-driven form engine**: extended the shared lifecycle form engine (**json-logic** rules with **Vest** validation) powering every transactional journey, adding form-value-driven conditional steps, MFA step overrides, and per-step OTP parameter overrides — replacing duplicated per-service logic with declarative configuration.
- **Shared API layer**: authored typed endpoints, request/response models, and **React Query** hooks in the shared service package across the payment, settings, registration, investment, and transfer domains; drove the request/response naming convention later adopted codebase-wide.
- **Micro-frontend delivery**: scaffolded and shipped two services (Payment, Investment) end-to-end — **Vite** and **Module Federation** build configuration, multi-environment setup, nginx serving, and host registration in the app shell — enabling independent deployment across teams without cross-module coupling.

_React · TypeScript · Vite Module Federation · Turborepo · TanStack Router/Query · React Hook Form · Vest · Zod · Tailwind CSS · Radix UI · Storybook · MSW · Flagr · Tolgee/i18next · Biome_

---

## BRAIN IPB

**IT Programmer** (July 2023 – March 2024) · _Bogor, West Java_

- Built full-stack web applications using **Next.js** (SSR, API routes) with a **NestJS** backend for research and transparency tracking systems.
- Developed **smart contracts** and decentralized applications (**DApps**) using **Hyperledger Fabric** and **Fablo**, integrating blockchain into existing systems for transaction traceability.
- Collaborated with blockchain domain experts to design scalable and efficient **consensus mechanisms**.

_Next.js · Node.js · NestJS · Hyperledger Fabric · Fablo_

---

## Badr

**Web Developer** (March 2023 – April 2023) · _Remote_

- Built and customized **WordPress** sites for client projects.
- Developed custom **micro-animations** in HTML, CSS, and JavaScript.

_WordPress · HTML · CSS · JavaScript_

---

## Startup Campus

**Junior Full Stack Developer** (September 2022 – December 2022) · _Remote_

- Implemented **Figma UI designs** with **Next.js** and **Material UI**, boosting user engagement by **20%**.
- Applied **server-side rendering** techniques that reduced website load times by **40%**.
- Executed an **SEO strategy** that landed the site in the **top 3 Google search results** for target keywords.

_Next.js · Material UI · SEO · SSR_`,
  },
  {
    slug: 'skills-and-tools',
    title: 'Skills and Tools',
    description:
      "A look at all the programming languages, libraries, and tools I've worked with.",
    caption: 'Work',
    mascot: 'excited',
    body: `Most of what I know comes from shipping it — a banking platform maintained by ~30 engineers, an AI product that grew to 200,000+ users, and a handful of things in between. Here's what I actually reach for:

## Frontend

The core of my work: typed, accessible, componentized interfaces.

- **React & TypeScript**: my daily drivers. Strict typing all the way to the API boundary.
- **Next.js**: my go-to framework for fast, SEO-friendly, full-stack web apps.
- **TanStack Router & Query**: type-safe routing and server-state management for large single-page apps.
- **React Hook Form, Vest & Zod**: form state, validation rules, and schema-level type safety.
- **Tailwind CSS**: utility-first styling that stays consistent as a codebase grows.
- **Radix UI**: unstyled, accessible primitives — the right foundation for a design system.
- **HTML5, CSS3 & JavaScript (ES6+)**: the fundamentals everything else sits on.

## Architecture & Developer Experience

Building for one app is easy. Building for eleven teams is the interesting part.

- **Vite & Module Federation**: micro-frontend builds that deploy independently, without cross-module coupling.
- **Turborepo**: monorepo pipelines and shared packages across services.
- **Storybook**: components documented and developed in isolation from the backend.
- **MSW**: API mocking so the UI never waits on an endpoint to exist.
- **Vitest**: fast unit testing close to the source.
- **Biome**: linting and formatting without the config sprawl.
- **Flagr**: feature flags for controlled, reversible rollouts.
- **Tolgee & i18next**: internationalization that translators can actually work with.

## Backend

Frontend is my focus, but I build the other half when a project needs it.

- **Node.js**: server-side logic and APIs that pair naturally with the frontend.
- **NestJS**: structured, scalable server-side applications.
- **Express.js**: quick, straightforward API development.
- **PHP & Laravel**: for projects already living in that ecosystem.

## Databases & Storage

- **PostgreSQL**: relational data, structured schemas, complex queries.
- **MySQL**: the classic, still everywhere.
- **MongoDB**: document storage when the shape of the data keeps moving.
- **Redis**: caching, sessions, and real-time workloads.
- **Cloudflare R2**: object storage — it backs the blog you are reading this on.

## Tools & Platforms

- **Git & GitHub**: version control and collaboration.
- **Cloudflare Workers**: edge deployment for this site, via OpenNext.
- **Docker**: consistent environments from local to production.
- **nginx**: serving and routing deployed apps.
- **Figma**: where designs get read before they get built.
- **Visual Studio Code**: my editor of choice.

## Blockchain

- **Hyperledger Fabric & Fablo**: permissioned networks, smart contracts, and DApps built for transaction traceability.

## Languages

- **Bahasa Indonesia**: native.
- **English**: professional working proficiency.

## Always Learning, Always Improving

The world of tech moves fast, and so do I. I'm constantly exploring new tools, frameworks, and best practices to make sure the work I deliver stays current and maintainable.`,
  },
  {
    slug: 'contact',
    title: 'Contact',
    description:
      'Get in touch with me anytime, through social media, e-mail, or phone number.',
    caption: 'Work',
    mascot: 'content',
    body: `Just a friendly reminder that the information provided here is for **business purposes only**. If you have any questions, feel free to chat with me directly on my social media.

I appreciate your understanding in using this responsibly.

---

## Contact

| Contact  | Detail                  |
| -------- | ----------------------- |
| Address  | Jakarta, Indonesia      |
| Timezone | GMT+7                   |
| E-mail   | tioramadhan9f@gmail.com |

If you need any further information, such as my phone number, please do not hesitate to send me an email first.

---

## Social Media

If you want to find me on social media, just search for **@tioramadhn**. That's my username on almost all platforms, so it should be easy to find me.

But if you're short on time, here are the platforms I use most:

| Social Media | Profile URL                                                      |
| ------------ | ---------------------------------------------------------------- |
| LinkedIn     | [linkedin.com/in/tioramadhn](https://linkedin.com/in/tioramadhn) |
| GitHub       | [github.com/tioramadhn](https://github.com/tioramadhn)           |
| Instagram    | [instagram.com/tioramadhn](https://instagram.com/tioramadhn)     |`,
  },
  {
    slug: 'credits',
    title: 'Credits',
    description:
      'What this site is built on, who it borrowed from, and where to buy me a coffee.',
    caption: '',
    mascot: 'happy',
    body: `## Special Thanks

- **[Enji Kusnadi](https://enji.dev)** — the first version of this site was built
  on top of his [enji.dev](https://github.com/enjidev/enji.dev) portfolio. It has
  since been rebuilt from scratch, but the starting point was his, and a lot of
  the original ideas stuck around.

## Built With

- **[Next.js](https://nextjs.org)** — App Router, React Server Components.
- **[Tailwind CSS](https://tailwindcss.com)** — the neobrutalist theme is a handful of CSS variables and three box-shadows.
- **[Cloudflare Workers](https://workers.cloudflare.com)** via **[OpenNext](https://opennext.js.org/cloudflare)** — hosting.
- **[Cloudflare R2](https://developers.cloudflare.com/r2/)** — every word on this site, written straight from the \`/admin\` editor and stored as markdown.
- **[Archivo Black](https://github.com/Omnibus-Type/ArchivoBlack)** by Omnibus-Type — the display face, here and on every social card.
- **[react-markdown](https://github.com/remarkjs/react-markdown)** with remark and rehype — one renderer for posts, pages, and the editor preview.
- **[highlightjs-solidity](https://github.com/highlightjs/highlightjs-solidity)** — highlight.js ships no Solidity grammar, and a course full of smart contracts needed one.
- **[lottie-web](https://github.com/airbnb/lottie-web)** — the mascot, on the light build with expressions compiled out.

## Buy Me a Coffee

Everything here is free to read, the [19-part Web3 course](/blog/series/tutorial-web-3)
included. No paywall, no ads, nothing to sign up for. If something here saved you
an afternoon, a coffee is always welcome:

\`\`\`
0x88Ed4a365555B47bC3d05106768EaFF00D181c34
\`\`\`

Any **EVM** network reaches that address: Ethereum mainnet, Base, Arbitrum,
Optimism, or Polygon. On a Layer 2 the gas costs a fraction of mainnet, so for a
small amount that is the kinder route — which is the whole argument of
[Modul 11](/blog/modul-11-layer-2-optimasi-gas).

One warning, and it is the same one from
[Modul 4](/blog/modul-4-ethereum-wallet-transaksi): send only from an EVM chain.
Anything sent from Bitcoin, Solana, or Tron cannot arrive at this address, and
there is no way to recover it.`,
  },
];
