# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Repository

Personal portfolio site (tioramadhn.com). Originally a fork of `enji.dev`
(Turborepo + Pages Router); **rebuilt from scratch in v2** as a single Next.js
16 App Router app at the repo root, deployed to Cloudflare Workers.

The previous tree is parked in `.legacy/` (gitignored) and can be deleted.

## Commands

```bash
pnpm install          # Node >=20.9; postinstall regenerates cloudflare-env.d.ts
pnpm dev              # Next dev + local Cloudflare bindings (local R2)
pnpm build            # next build (Turbopack)
pnpm preview          # opennextjs-cloudflare build + run in workerd
pnpm run deploy       # opennextjs-cloudflare build + deploy (NOT `pnpm deploy`)
pnpm check            # typecheck + lint + prettier --check
pnpm cf-typegen       # regenerate cloudflare-env.d.ts after editing wrangler.jsonc
```

There is no test suite. Verification is `pnpm check`, then `pnpm preview` and
exercising the routes.

`pnpm deploy` without `run` silently hits pnpm's builtin workspace-deploy
command and fails; always `pnpm run deploy`. Deploying any other way (dashboard
upload, `wrangler deploy` from elsewhere) uploads a Worker **without the
bindings in wrangler.jsonc**, which throws `error code: 1101` on every request.
Verify a deploy with `pnpm wrangler versions view <id> --json` — the bindings
must include `ASSETS` and `BLOG_BUCKET`.

`workers_dev` and `preview_urls` are `false`: the site is served from the custom
domain only, so `/admin` is not also reachable on a workers.dev URL.

Secrets live in `.dev.vars` locally (`ADMIN_PASSWORD`, `AUTH_SECRET`) and as
Worker secrets in production. `.dev.vars.example` is the template.

## Architecture

### All content is editable, and all of it is markdown

There is no MDX and no content in JSX. Every word a visitor reads comes from R2,
falling back to a built-in default:

| What                                      | R2 key                | Default            |
| ----------------------------------------- | --------------------- | ------------------ |
| Profile, hero, stack, highlights, socials | `site/settings.json`  | `DEFAULT_SETTINGS` |
| Projects (meta + markdown body)           | `site/projects.json`  | `DEFAULT_PROJECTS` |
| Work pages and credits                    | `site/pages.json`     | `DEFAULT_PAGES`    |
| Blog posts                                | `posts/<slug>.md`     | —                  |
| Uploads (images, CV)                      | `media/<yyyy>/<mm>/…` | —                  |

**The defaults in `src/content/defaults.ts` are the real site copy**, not
placeholders. A fresh deploy against an empty bucket renders the finished site,
and there is no migration step: the first save in `/admin` starts overriding it.
Never make a reader throw on a cold bucket — `src/lib/content.ts` swallows R2
errors and returns defaults, deliberately.

`src/lib/content.ts` (site content) and `src/lib/posts.ts` (blog) are the only
modules that know the storage layout. Go through them rather than touching the
bucket. Settings merge per section, so a settings file written before a new
section existed still picks that section up from defaults.

Blog post metadata (title, description, date, tags, status, cover, series,
readingTime) rides as R2 **custom metadata**, so `listPosts()` is a single
`bucket.list({ include: ['customMetadata'] })` with no body reads.

### Series

A post joins a series by naming one in the editor's **Series** field (or a
`series:` front-matter key on import). Only the display title is stored; the
slug is derived from it with `slugify`, so there is one source of truth and
renaming a series renames `/blog/series/<slug>` with it.

Order within a series is **date ascending** — the reverse of the blog index —
and there is no separate order number, so resequencing means changing dates.
`getSeriesContext()` reads published posts only, so an unpublished middle
instalment never leaves a dead "next" link; the chain closes over it. Series
surface in three places: the navigation on a post (`components/series-nav.tsx`),
the `/blog/series/[slug]` page, and a "Baca berurutan" block on `/blog`.

`--header-height` in `@theme` is the one place SiteHeader's size is written
down (`h-16` plus its 3px border); the rail's sticky offset reads it rather than
guessing, which is what kept it from sliding under the navbar.

On a post, `series-nav.tsx` exports three pieces: `SeriesSidebar` (the sticky
left rail, `lg` and up), `SeriesSummary` (the same information stacked above the
article below `lg`), and `SeriesSteps` (previous/next, under the article at
every width — it belongs where the reader is when they finish, and the titles
are far too long for a 16rem rail). A post in a series widens to `max-w-6xl` so
the rail does not eat the prose; everything else stays `max-w-5xl`.

`SeriesNavToggle` hides the rail. It floats (`position: fixed`, bottom-right)
so it is in reach at any scroll position — bottom-_left_ was tried first and
covered the very list it opens, and sitting it after the article meant nobody
found it. Like `ThemeToggle` it keeps **no React state**:
it writes `data-series-nav="hidden"` on `<html>`, `seriesNavInitScript` applies
that before first paint, and CSS does the rest. Note that `.series-sidebar`
carries no Tailwind `hidden lg:block` — utilities sit in a later cascade layer
than `@layer components`, so a display utility would beat the hide rule and the
rail could never close.

`/blog` lists a series **once**, as that block, and filters its instalments out
of the feed below — otherwise one course buries every standalone post. The tag
row is derived from the feed, not the whole archive, so it never advertises a
tag nothing visible carries. RSS is unfiltered on purpose: it is a feed of
everything written.

Because every page reads R2, **every route is `force-dynamic`**. That is the
price of full editability and it is intentional; do not "optimise" a content
page back to static without moving its content back into the bundle.

### Markdown conventions

One renderer for everything: `src/components/markdown.tsx` (react-markdown +
remark-gfm + rehype-slug + rehype-highlight). highlight.js ships no Solidity
grammar, so `highlightjs-solidity` is passed to rehype-highlight's `languages`
option — add any other missing grammar the same way, not by registering it on a
global `hljs`. Two conventions replace what used to need MDX components:

- `![caption](/clip.webm)` — a `.webm`/`.mp4`/`.mov` source renders as an
  autoplaying muted `<video>`, with the alt text as its caption.
- `![alt](/shot.png "caption")` — a title renders a `<figure>` + `<figcaption>`.
- Every fenced block is wrapped by `components/copy-button.tsx`, which adds a
  copy button. It reads the rendered DOM at click time, not the AST, and strips
  trailing newlines — a wallet address with a stray `\n` is rejected by some
  wallets.
- A blockquote opening with `[!jawaban]`, `[!pembahasan]`, `[!petunjuk]` or
  `[!hasil]` renders as a **collapsed `<details>`** (`src/lib/remark-reveal.ts`).
  Text after the marker overrides the summary: `> [!petunjuk] Masih buntu?`.
  Exercise answers must use this — an answer sitting in plain sight below the
  question is not an exercise. It is a native `<details>`, so no client
  JavaScript and the post stays a server component.

### Admin

`/admin` has four sections, all behind the same session: **Posts**, **Profile**,
**Projects**, **Pages**. `src/app/admin/actions.ts` holds post actions and
`content-actions.ts` the rest; both re-check auth per action.

`src/components/admin/markdown-field.tsx` is the shared editing surface
(toolbar, preview, paste/drop image upload) used by all three editors — extend
it rather than copying it. `src/components/admin/fields.tsx` holds the form
primitives.

### Cloudflare specifics

- Bindings come from `getCloudflareContext({ async: true })`, wrapped in
  `src/lib/env.ts` (`getBlogBucket`, `getSecret`). `getSecret` falls back to
  `process.env` so it still works outside a Worker context.
- **Node middleware / `proxy.ts` is not supported by the adapter.** Admin
  authorisation is therefore enforced in `src/app/admin/layout.tsx` _and_
  re-checked inside every server action (`assertAuthenticated`) and the upload
  route. If you add a write path, add the check too — there is no choke point.
- `open-next.config.ts` is deliberately empty. Nothing uses ISR: blog routes are
  `force-dynamic`, everything else is prerendered at build. Adding
  `export const revalidate` anywhere means wiring up `incrementalCache`, `queue`
  and `tagCache` there plus the matching bindings in `wrangler.jsonc`.
- Bindings are not available during `next build`, so a route that reads R2 must
  be dynamic or it will fail to prerender.
- `R2.put()` needs a known content length — pass an `ArrayBuffer`, not
  `File.stream()`.
- Keep the Worker under 3 MiB gzipped (currently ~1.4 MiB). Check with
  `pnpm exec wrangler deploy --dry-run`.

### Mascot

A 19-expression chibi sticker set lives in `public/mascot/*.json` as Lottie
animations. They are **not vector** — each file wraps cut-out PNGs (some split
into parts, e.g. `waving` has body + hand) animated by transform keyframes.

- `src/lib/mascot.ts` is the registry: a `MascotExpression` union mapped to file
  names, plus alt text. Add an expression there, never by hardcoding a path.
- `src/components/mascot.tsx` renders one. It waits for an IntersectionObserver
  hit, then dynamically imports the player and fetches the JSON, so neither is
  in the initial bundle: the ~161KB lottie chunk and the 85-240KB sticker are
  on-demand only. The box is sized up front so nothing shifts.
- The player is `lottie-web/build/player/esm/lottie_light.min.js` (SVG renderer,
  **expressions compiled out**). Keep it: the stickers are third-party JSON, and
  the light build cannot evaluate script embedded in them. `src/types/lottie.d.ts`
  declares the untyped subpath.
- `prefers-reduced-motion` holds the animation on frame one rather than hiding
  it, so the art still shows.
- `PageHeader` and `MdxPage` take an optional `mascot` prop — that is how most
  pages get one. Only reach for `<Mascot>` directly for one-off placements
  (hero, empty states, editor banners).
- One mascot per page. They are ~100KB each; do not stack them.

### Design system

Neobrutalism, defined almost entirely in `src/app/globals.css` with Tailwind v4's
CSS-first config:

- `@theme` holds the palette (`--color-paper`, `--color-ink`, `--color-brand`,
  `--color-lime`, …) and the three shadows (`--shadow-brutal{,-sm,-lg}`), which
  Tailwind turns into `bg-*`/`text-*`/`shadow-*` utilities.
- `--color-code` is the code-block canvas and is deliberately **not**
  `--color-ink`: in light mode the border is ink, and filling the block with the
  same value swallows its own border and hard shadow.
- Dark mode is a `.dark` class on `<html>` that redefines those colour variables,
  so borders and shadows flip automatically. The `@custom-variant dark` at the
  top of the file wires up the `dark:` variant. `ThemeToggle` writes the class
  directly and keeps **no React state** — the icon is chosen by `dark:`, so there
  is nothing to hydrate.
- Composite utilities: `panel`, `panel-flat`, `panel-interactive` (hover lift /
  active press), `label-chip`, `display-text`, and `prose-brutal` for all
  long-form content (MDX pages, blog posts, and the editor preview).
- Prefer these utilities over repeating `border-[3px] shadow-brutal` strings.

### Social cards and analytics

Every post and series page gets a generated OG image from `/api/og/[slug]` and
`/api/og/series/[slug]`, drawn by `src/lib/og-card.tsx`. Two things to keep in
mind:

- The title is read from R2 **by slug**, never from a query string, so the route
  cannot be used to render arbitrary text under this site's branding.
- `next/og` pulls in resvg + satori, which is most of the jump from ~1.5 MiB to
  ~2.3 MiB gzipped. That is the single largest thing in the Worker; check
  `pnpm exec wrangler deploy --dry-run` before adding anything else sizeable.
- The display font is served through the `ASSETS` binding (`readAsset` in
  `src/lib/env.ts`), not bundled, so it costs nothing against that limit.

`WEB_ANALYTICS_TOKEN` in `wrangler.jsonc` turns on Cloudflare Web Analytics.
Empty (the default) renders no beacon at all, which is why local development is
never counted. `/admin` is excluded by path — a server component has no
`usePathname`, and this site has no middleware, so `components/analytics.tsx`
reads the adapter's `x-opennext-initial-url` header instead.

### Writing style for Indonesian content

The blog's long-form content is in Bahasa Indonesia. Two habits make that prose
read like machine translation, and both were cleaned out of the Web3 series once
already:

- **Em dashes.** Indonesian rarely uses `—`. Prefer a comma, a period, a colon,
  or parentheses, and restructure the clause rather than reaching for a dash.
  The only `—` left in `content-drafts/` is the standalone "nil" marker inside
  table cells. Headings and list labels use `:` or a period (`### Latihan 3:
Fuzz test`, `**Komunikasi.** Umumkan …`), never a dash.
- **Literal English constructions.** "To be fair" is not "Adil juga dicatat"
  (use "Supaya adil"); "cases where" is not "kasus di mana" (use "keadaan
  yang"); and `ia` for an inanimate subject is awkward, so repeat the noun or
  recast the sentence.

English UI copy is a separate matter: an em dash there is ordinary English
style, not a tell, and those were deliberately left alone.

## Conventions

- Class names composed with `clsx`, one responsive breakpoint per string
  (`'md:px-4'`), auto-sorted by `prettier-plugin-tailwindcss`.
- Prettier: single quotes, es5 trailing commas. ESLint is `eslint-config-next`
  flat config (`core-web-vitals` + `typescript`), which includes the React
  Compiler rules — avoid `setState` inside an effect and don't hand-memoize in a
  way the compiler can't preserve.
- Path alias `@/*` → `src/*`. Type aliases are prefixed `T` only where they are
  shared; component prop interfaces stay local to the component.
- Optional props get defaults in the destructuring, not `defaultProps`.
