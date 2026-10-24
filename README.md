# tioramadhn.dev

Personal site for Tio Ramadhan — Next.js 16 (App Router) on Cloudflare Workers,
with a blog that is written from the browser and stored in Cloudflare R2.

## Stack

| Piece       | Choice                                                                |
| ----------- | --------------------------------------------------------------------- |
| Framework   | Next.js 16, App Router, React 19, Turbopack                           |
| Styling     | Tailwind CSS v4 (CSS-first config), neobrutalist theme                |
| Hosting     | Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare) |
| Blog store  | Cloudflare R2 (`BLOG_BUCKET`)                                         |
| Static text | MDX files under `src/app/**/content.mdx`                              |

## Getting started

```bash
pnpm install
cp .dev.vars.example .dev.vars   # then edit the two secrets
pnpm dev
```

`pnpm dev` runs Next with the Cloudflare bindings attached, so `/admin` writes
to a **local** R2 bucket under `.wrangler/state` — nothing touches production.

Set the two secrets in `.dev.vars`:

```bash
ADMIN_PASSWORD=...                       # the password for /admin
AUTH_SECRET=$(openssl rand -base64 32)   # signs the session cookie
```

### Commands

| Command           | What it does                                         |
| ----------------- | ---------------------------------------------------- |
| `pnpm dev`        | Next dev server with local R2 bindings               |
| `pnpm build`      | `next build`                                         |
| `pnpm preview`    | Build and run the real Worker locally (workerd)      |
| `pnpm run deploy` | Build and deploy to Cloudflare                       |
| `pnpm check`      | Types, lint and format in one go                     |
| `pnpm cf-typegen` | Regenerate `cloudflare-env.d.ts` from wrangler.jsonc |

## Writing

`/admin` is the whole CMS:

- `/admin/login` — one password, a 7-day signed cookie.
- `/admin` — every post, draft and published, with publish/unpublish/delete.
- `/admin/new` and `/admin/edit/<slug>` — markdown editor with a toolbar, live
  preview, and image upload by **paste or drag-and-drop** straight into R2.
  `Import .md` loads an existing markdown file, front matter included.

Drafts are invisible everywhere public — the post page 404s, and they are left
out of `/blog`, the sitemap and the RSS feed.

### How a post is stored

One R2 object per post:

```
posts/<slug>.md      # the markdown body, nothing else
media/<yyyy>/<mm>/…  # uploaded images, served through /media/*
```

Title, description, date, tags, status, cover and reading time ride along as R2
**custom metadata**, so the blog index is a single `list()` call and never has
to read a body:

```ts
await bucket.list({ prefix: 'posts/', include: ['customMetadata'] });
```

The object itself stays a plain markdown file, readable with
`wrangler r2 object get`.

## Mascot

Nineteen chibi expressions ship as Lottie files in `public/mascot/`. Pages pull
one in through the `mascot` prop on `PageHeader` / `MdxPage`, or `<Mascot>`
directly:

```tsx
<Mascot expression="celebrating" size={56} play="once" />
```

Expressions are listed in `src/lib/mascot.ts`. Where they are used:

| Expression    | Where                                |
| ------------- | ------------------------------------ |
| `waving`      | homepage hero                        |
| `focused`     | `/projects`, SOM AI                  |
| `monitoring`  | OCTO project, admin dashboard        |
| `surprised`   | Badr project                         |
| `goal`        | `/work/experience`                   |
| `excited`     | `/work/skills-and-tools`             |
| `content`     | `/work/contact`                      |
| `happy`       | `/credits`                           |
| `writing`     | `/blog` with posts, the post editor  |
| `sleeping`    | empty `/blog`, empty admin dashboard |
| `locked`      | `/admin/login`                       |
| `celebrating` | after a post is published            |
| `burnedOut`   | editor errors, the global error page |
| `confused`    | 404                                  |

Nothing about the mascot is in the initial bundle: the player and the sticker
are fetched only once the element nears the viewport. Keep it to one per page —
each sticker is 85–240KB.

## Deploying

First time only:

```bash
pnpm wrangler login
pnpm wrangler r2 bucket create tioramadhn-blog
pnpm wrangler secret put ADMIN_PASSWORD
pnpm wrangler secret put AUTH_SECRET
```

Then:

```bash
pnpm run deploy
```

> **`run` is not optional here.** `pnpm deploy` is a pnpm _builtin_ (it deploys a
> workspace package) and never reaches this project's script — it fails with
> `ERR_PNPM_CANNOT_DEPLOY  A deploy is only possible from inside a workspace`.
> Deploying any other way (for example uploading from the dashboard) produces a
> Worker with **no bindings**, which throws `error code: 1101` on every request
> because `ASSETS` and `BLOG_BUCKET` are missing.

After deploying, confirm the bindings wrangler printed are
`BLOG_BUCKET`, `ASSETS` and `NEXT_PUBLIC_SITE_URL`. To inspect what is actually
live:

```bash
pnpm wrangler versions view <version-id> --json
```

Point `NEXT_PUBLIC_SITE_URL` in `wrangler.jsonc` at the real domain, and add a
custom domain to the Worker in the Cloudflare dashboard.

## Project layout

```
src/
  app/
    page.tsx                   home
    blog/                      list + [slug], read from R2 at request time
    projects/<slug>/           page.tsx + content.mdx
    work/<slug>/               page.tsx + content.mdx
    admin/                     login, dashboard, editor, server actions
    api/media/route.ts         authenticated image upload
    media/[...key]/route.ts    public read-through for uploaded images
    globals.css                the entire design system
  components/                  header, footer, cards, markdown renderer, editor
  content/                     projects and homepage data
  lib/                         r2 bindings, posts, auth, markdown helpers
mdx-components.tsx             global MDX components (Video, Figure, links)
```

### Adding a page

Create `src/app/<path>/content.mdx` with a `meta` export and a `page.tsx` that
renders it:

```mdx
export const meta = {
  caption: 'Work',
  title: 'Something',
  description: 'Shown under the title and in the meta tags.',
};

## A heading
```

### Adding a project

Add an entry to `src/content/projects.ts`, then create
`src/app/projects/<slug>/` with the usual `page.tsx` + `content.mdx` pair.

## Notes

- **No middleware.** The Cloudflare adapter does not support Node middleware
  (`proxy.ts`), so authorisation is enforced in `src/app/admin/layout.tsx` and
  re-checked inside every server action and write route.
- **No ISR.** Blog routes are `force-dynamic`: R2 reads are fast, and a publish
  is visible immediately. If you ever add `export const revalidate`, wire up the
  cache overrides in `open-next.config.ts` first.
- The site is a rebuild of a fork of [enji.dev](https://github.com/enjidev/enji.dev);
  see `/credits`.
