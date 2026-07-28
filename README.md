# GRC Site — Eleventy + Netlify Visual Editor

This is the Global Reasoning Challenge sample site rebuilt on Eleventy so it can be
edited with Netlify's Visual Editor (drag-and-click content editing), while keeping
the exact same design, URLs, forms, login/signup, and PDF downloads as the previous
static build.

## What changed vs. the plain static site

- Page content (title, meta description, full body HTML) now lives in
  `content/pages/*.json` — one file per page — instead of being hard-coded in a
  Python generator script.
- Eleventy (`src/templates/page.njk`) reads those JSON files and renders each one
  through the shared layout/nav/footer in `src/_includes/`.
- `stackbit.config.ts` tells Netlify Visual Editor how to find and edit those
  content files (Git CMS content source).
- Everything else — `styles.css`, `script.js`, the `downloads/` PDFs and ZIP, and
  the `netlify/functions` backend (login, signup, contact, newsletter, school
  registration/partnership, account) — is copied over unchanged and untouched by
  this migration.

## Local development

```bash
npm install
npm run dev       # Eleventy dev server on :3000 with live reload
# or
npm run build      # outputs static site to _site/
```

## Editing content

Each page's content file is at `content/pages/<slug>.json`:

```json
{
  "title": "About GRC",
  "metaDescription": "...",
  "body": "<section>...</section>"
}
```

`body` is the full HTML for the page (hero + all sections). Editing it directly,
or through Visual Editor's rich text/HTML editor, changes the rendered page.

## Enabling Netlify Visual Editor (steps you need to run yourself)

I can't install GitHub Apps or click through your Netlify dashboard on your
behalf, so once this is pushed to your GitHub repo:

1. Push this project to your GitHub repo (same as before — I can give you the
   exact git commands, but the actual `git push` has to run under your own
   credentials).
2. In the Netlify dashboard, go to your site → **Project configuration** →
   **Visual Editor** → **Enable visual editor**.
3. Netlify will prompt you to install its GitHub App on the repo if it isn't
   already — approve that in your GitHub account.
4. Confirm the working branch (usually `main`) under **Visual editor → Preview
   settings**.
5. Netlify builds the project in a cloud container using `devCommand` from
   `stackbit.config.ts` (`npx @11ty/eleventy --serve --port {PORT}`) and opens
   the Visual Editor with your sitemap (all 24 pages) on the left and the live
   page preview in the middle.

## Deploying (production builds, same as before)

`netlify.toml` now builds with `npm run build` (Eleventy) and publishes `_site/`,
functions still deploy from `netlify/functions/`. The `/api/*` and `/account`
redirects are unchanged.

Required environment variables (unchanged from the previous Netlify Functions
setup): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`.
