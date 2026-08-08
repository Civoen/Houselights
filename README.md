# Houselights

A small app that builds a Spotify playlist from the artists you're about to see live.
Search for an artist, add them to your lineup, set how many songs you want from each
(popular / recent / deep cuts, plus specific hand-picked tracks), preview and reorder
the full playlist, then create it directly in your Spotify account.

Built for a single user for now — see the notes on Spotify's development mode below.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Spotify Web API (Authorization Code flow, server-side, cookie-based session)
- API routes run on the Edge runtime (`export const runtime = "edge"`) and deploy to
  Cloudflare Pages via `@cloudflare/next-on-pages`

**Note on the adapter:** `@cloudflare/next-on-pages` is the Pages-compatible path, but
Cloudflare and the Next.js team are steering new projects toward `@opennextjs/cloudflare`
on Workers instead — npm flags `next-on-pages` as deprecated on install, even though it
still works today. This project uses it because it matches an existing Pages workflow;
if that ever changes, moving to Workers means running `@opennextjs/cloudflare` instead
and removing the `export const runtime = "edge"` lines from the five API routes.

## 1. Register a Spotify app

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app.
2. Add a Redirect URI: `http://127.0.0.1:3000/api/auth/callback` for local dev.
   (Use `127.0.0.1`, not `localhost` — Spotify only allows plain HTTP on the loopback address.)
3. Under **Users and Access**, add your own Spotify account email so you can log in
   while the app is in development mode (limit of 5 users).
4. Note your Client ID and Client Secret.

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

```
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback
APP_URL=http://127.0.0.1:3000
SESSION_SECRET=any-long-random-string
```

## 3. Run locally

```
npm install
npm run dev
```

Open http://127.0.0.1:3000, tap **Build your lineup**, then **Connect Spotify** when prompted.

## 4. Deploy to Cloudflare Pages

In the Cloudflare dashboard: **Workers and Pages > Create application > Pages > Connect to Git**,
select this repo, and set:

- **Build command**: `npx @cloudflare/next-on-pages`
- **Build output directory**: `.vercel/output/static`

Add your environment variables under **Settings > Environment variables** (values from
step 2, with `SPOTIFY_REDIRECT_URI` and `APP_URL` pointing at your `*.pages.dev` domain
or custom domain instead of `127.0.0.1`). Update the redirect URI in the Spotify
dashboard to match, then deploy.

Once deployed, visiting the site on your phone and using "Add to Home Screen"
installs it as a PWA (manifest + service worker are already wired up in `public/`).

## How playlist generation works

**Important context:** Spotify's [February 2026 Development Mode changes](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)
removed the artist top-tracks endpoint entirely and dropped the `popularity`
field from every track/album/artist response. There is no longer a direct way
for a Development Mode app to ask "what are this artist's most popular songs" —
so the filters below are the closest practical approximation of the original
design, not the original implementation.

For each artist in your lineup:

- **Most popular** — approximated via Search's relevance ordering for `artist:"Name"`
  (Search still ranks by relevance internally even though the score isn't exposed).
  This is a reasonable proxy but won't always match what Spotify itself would
  call an artist's biggest hits.
- **Recent** — pulls the artist's full album/single catalog and sorts by release date
  (this one is unaffected by the popularity removal).
- **Deep cuts** — same catalog pull, with anything that showed up in the "Most
  popular" search results excluded, on the theory that what's left is less
  obvious. No true popularity-ascending sort is possible anymore.
- **Add specific songs** — a plain track search scoped to that artist, added on top
  of (or instead of) the automatic picks. Unaffected by any of this.

The count you set per artist (defaults: 20 for the first artist you add, 10 for the
rest — tweak as needed) controls how many auto-selected tracks are pulled in per
filter. Everything is combined into one list on the preview screen, where you can
remove, reorder (drag the handle), or add more before creating the playlist.

## Known limitations / next steps

- **Spotify's Feb 2026 API changes are baked into this code already** — playlist
  creation uses `POST /me/playlists` (not the removed `/users/{id}/playlists`),
  tracks are added via `/playlists/{id}/items` (not the renamed-away `/tracks`),
  and nothing here calls a batch endpoint like `GET /tracks?ids=...` since those
  were removed too. If Spotify changes things again, the
  [changelog](https://developer.spotify.com/documentation/web-api/references/changes/february-2026)
  is the first place to check.
- "Most popular" and "Deep cuts" are approximations (see above) — there's no
  path back to true popularity-based sorting until/unless Spotify reintroduces
  that data for Development Mode apps.
- Deep cuts and Recent fetch a fair number of Spotify endpoints per artist
  (albums → album tracks, individually since batch fetching is gone), so
  building a large lineup can take a few seconds. Worth adding a loading state
  per artist if this becomes annoying in practice.
- No offline queueing of playlist creation — the service worker caches pages for
  fast reloads, but creating a playlist still requires a live connection.
- Cover image upload is best-effort: if it fails, the playlist is still created
  without a custom cover rather than blocking the whole flow.
- Spotify's development mode currently caps you at 5 allowlisted users and requires
  the app owner to have Premium — fine for solo use, but worth knowing about before
  sharing this with friends.
- All five API routes run on the Edge runtime, which is a smaller API surface than
  full Node.js. The app doesn't currently rely on anything outside that surface, but
  if you add a feature that needs a Node-only package, it either needs an
  Edge-compatible alternative or a move to the Workers + OpenNext path described above.
