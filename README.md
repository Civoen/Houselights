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

`ANTHROPIC_API_KEY` is optional — only needed for the "Upload a poster to
auto-add artists" feature on the lineup builder. Get one at
[console.anthropic.com](https://console.anthropic.com). Without it, that
button still appears but tells you it isn't configured rather than failing
silently — everything else in the app works fine without it.

**If you connected before this version**, reconnect once (Settings > Switch
account, or just log out and reconnect) — the app now requests the
`user-top-read` scope for the "quick add from your top artists" row on the
lineup builder, and existing sessions won't have that permission until you
re-authorize.

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

## Editing the site's text

Every piece of static UI copy — titles, button labels, hints, placeholders,
empty states — lives in one file: `src/lib/copy.ts`. Edit strings there
directly (in GitHub's web editor, or locally) and push — no need to touch
any component to reword something. It's organized by screen (`copy.home`,
`copy.lineup`, `copy.preview`, etc.), and each string has a plain-English key
so it's easy to find what you're looking for.

A few things are deliberately *not* in that file: text assembled from
multiple dynamic pieces at once — like "Removed {track name}" undo toasts,
or the per-artist error list on the lineup builder — lives next to the logic
that builds it, since editing those safely means understanding the
surrounding code, not just swapping words. Everything else routes through
`copy.ts`.

## Quick add from your top artists

The lineup builder shows a horizontal row of your own top artists (via
`GET /me/top/artists`, one of the few personalization endpoints still
available for Development Mode apps) when the search box is empty, so you
can one-tap add artists you always want prepped rather than typing every
name. Requires the `user-top-read` scope — see the reconnect note above if
this shows a "Reconnect Spotify" prompt instead of your artists.

## No inline 30-second previews — here's why

Spotify deprecated `preview_url` for all newly-created apps back in
November 2024 — it's not a bug or something this app is doing wrong, every
track object simply comes back with that field `null` now, permanently, with
no documented way to opt back in. Building an inline player around it would
mean shipping a button that never actually works.

Instead, each track on the Preview screen has a small play icon that opens
that exact track in the Spotify app (`open.spotify.com/track/{id}`) — a real
way to spot-check a song before committing to it, just via a quick
app-switch rather than an inline clip.

## Lights up / Lights down (theme)

The theme toggle (bottom nav, or top-right on the home screen) switches
between a light theme ("Lights up") and a dark navy theme ("Lights down"),
persisted to `localStorage` and defaulting to the device's OS-level
light/dark preference on first visit. Every screen's colors are driven by
CSS custom properties swapped via a `.dark` class on `<html>`, rather than
per-component dark-mode classes — so if you ever add a new screen, it
inherits the theme automatically as long as it uses the existing color
tokens (`bg-surface`, `text-ink`, `border-line`, etc.) instead of raw hex
values.

## Poster reading

Uploading a poster photo sends a resized (max 1400px) JPEG to Claude via the
Anthropic API, asking it to list every performing artist visible on the
image. Each detected name is then searched against Spotify, and you get a
review screen — matched artists pre-checked, anything without a confident
Spotify match shown but unselectable — before anything's actually added to
your lineup. Nothing is added automatically without that confirmation step.

## Quality of life and personality touches

- **Undo on remove.** Removing an artist from the lineup or a track from the
  preview shows a brief "Removed [name] · Undo" toast rather than deleting
  instantly and permanently — a few seconds to reverse an accidental tap.
- **Retry a single failed artist.** If one artist's auto-fetch fails while
  others succeed, the warning panel lets you retry just that one artist
  instead of regenerating the whole lineup, or continue anyway with what did
  come through.
- **Live estimate while building.** A rough "≈N tracks · ~Xh Ym (estimate)"
  line appears as soon as you've added artists, based on the song counts
  you've set — before you've generated anything, so you can tune counts
  before committing to a fetch.
- **Song-distribution bar.** A thin multi-colored bar under the lineup header
  shows each artist's share of the total song count, color-matched to a small
  dot on each artist's card so it's easy to see who's contributing what.
- **First-playlist milestone.** The very first playlist you ever create gets
  slightly different success-screen copy, detected by checking whether your
  local event history was empty right before saving this one.
- **EQ-bar loading animation.** "Generating..." and "Creating..." use an
  animated three-bar equalizer (the same geometry as the app icon) instead of
  a generic spinner, with the loading text itself rotating through a few
  different phrases rather than sitting static.

## Reordering

All drag-to-reorder (lineup artists, playlist tracks, Previous Events) uses
the Pointer Events API rather than HTML5's native drag-and-drop. That's a
deliberate choice, not a style preference — native `draggable`/`dragstart`
never fires on touchscreens in any mobile browser, so an app built for phone
use can't rely on it. Pointer Events work the same way across touch, mouse,
and pen.

On the preview screen, alongside manual drag reordering there are three
one-tap ordering presets:

- **Hype** — orders tracks by artist starting with whoever you added last,
  working back up to the headliner, so the playlist builds toward your
  headliner the way the actual show usually runs (openers first, headliner
  closing).
- **Headliner** — the reverse: headliner's songs first, then down through
  support acts in the order you added them.
- **Shuffle** — fully random order, ignoring artist grouping entirely.

## How playlist generation works

**Important context:** Spotify's [February 2026 Development Mode changes](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)
removed the artist top-tracks endpoint entirely and dropped the `popularity`
field from every track/album/artist response. There is no longer a direct way
for a Development Mode app to ask "what are this artist's most popular songs" —
so the filters below are the closest practical approximation of the original
design, not the original implementation.

For each artist in your lineup:

- **Most popular** — leads with Search's relevance ordering for `artist:"Name"`
  (Search still ranks by relevance internally even though the score isn't exposed),
  then pads out with the rest of the artist's catalog if you've asked for more
  songs than the search results alone provide. Earlier versions of this only used
  the search pool with nothing to fall back on, which silently capped "Most
  popular" at however many unique songs search returned — often as few as 5 once
  duplicate re-releases and live versions were deduped, regardless of the count
  you'd actually set. Fixed now: it always has the full catalog to draw from.
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
- The artist catalog (albums → album tracks) is now always fetched for every
  request, not just for Recent/Deep cuts, since Most popular needs it as a
  fallback too. Album-track requests run in parallel rather than sequentially
  to keep this reasonably fast, but a lineup with several artists can still
  take a few seconds to generate. Worth adding a per-artist loading state if
  this becomes annoying in practice.
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
