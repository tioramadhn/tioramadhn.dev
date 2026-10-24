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

### Content lives in two places

1. **Static pages** — MDX on disk. Each content page is a pair:
   `src/app/<path>/content.mdx` (exports `meta` + the body) and
   `page.tsx` (imports both, renders `<MdxPage meta={meta}>`).
   `pageExtensions` is `['ts','tsx','mdx']`, so only `page.*` files are routes —
   a `content.mdx` sibling is just an import.
   Global MDX components (`Video`, `Figure`, link handling) are in the root
   `mdx-components.tsx`. Remark/rehype plugins are configured **by name string**
   in `next.config.ts` because Turbopack cannot receive JS functions.

2. **Blog posts** — markdown in Cloudflare R2, written from `/admin`. One object
   per post at `posts/<slug>.md`; all metadata (title, description, date, tags,
   status, cover, readingTime) is R2 **custom metadata**, so `listPosts()` is a
   single `bucket.list({ include: ['customMetadata'] })` with no body reads.
   Uploaded images go to `media/<yyyy>/<mm>/<name>-<rand>.<ext>`.

`src/lib/posts.ts` is the only module that knows the storage layout. Go through
it rather than touching the bucket directly.

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
- Dark mode is a `.dark` class on `<html>` that redefines those colour variables,
  so borders and shadows flip automatically. The `@custom-variant dark` at the
  top of the file wires up the `dark:` variant. `ThemeToggle` writes the class
  directly and keeps **no React state** — the icon is chosen by `dark:`, so there
  is nothing to hydrate.
- Composite utilities: `panel`, `panel-flat`, `panel-interactive` (hover lift /
  active press), `label-chip`, `display-text`, and `prose-brutal` for all
  long-form content (MDX pages, blog posts, and the editor preview).
- Prefer these utilities over repeating `border-[3px] shadow-brutal` strings.

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
