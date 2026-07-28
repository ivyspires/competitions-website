# GLRC Site — Netlify (Functions + Supabase)

Static site + backend, parallel to the Cloudflare Worker version, running on
Netlify Functions with a Supabase (Postgres) database instead of D1.

## Structure

- `public/` — all static pages, `styles.css`, `script.js`, `downloads/`
- `netlify/functions/` — one function per API route (contact, newsletter,
  school-registration, school-partnership, signup, login, logout) plus
  `account.js` which server-renders `/account`
- `netlify/functions/lib/auth.js` — shared password hashing (PBKDF2), signed
  session cookies (HMAC), and a small Supabase REST (PostgREST) client
- `netlify.toml` — routes `/api/*` and `/account` to the functions above

## Database

Uses the existing Supabase project **global-competitions**
(`https://flptfztscwsrpphvzbpk.supabase.co`), with 5 tables already created:
`users`, `contact_messages`, `newsletter_subscribers`,
`school_registrations`, `school_partnerships`. All have Row Level Security
enabled with **no policies**, meaning only the `service_role` key (used
server-side by these functions) can read or write — the public/anon key has
zero access, by design.

## Required environment variables (Netlify → Site settings → Environment variables)

- `SUPABASE_URL` = `https://flptfztscwsrpphvzbpk.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — copy this from the Supabase dashboard:
  Project Settings → API → `service_role` secret key. **Never commit this to
  git or share it in chat** — it bypasses Row Level Security entirely. Paste
  it directly into Netlify's environment variable UI.
- `SESSION_SECRET` = `12537b372c9cfd45081161af6d339b95c2e855dd2aefe06d49bd5b4daa0c0c58`
  (already generated for you; treat it as a secret too — used to sign login
  session cookies)

## Deploy

This site is already connected to Netlify via GitHub (project
`global-stem-competitions`, repo `ivyspires/competitions-website`), so a
normal `git push` to `main` triggers an automatic build and deploy — no
extra steps needed beyond setting the environment variables above once.

## Notes

- This is a second, independent backend from the Cloudflare Worker version —
  they don't share data (D1 vs Supabase are separate databases). Pick one as
  the source of truth if you don't want two divergent sets of submissions.
