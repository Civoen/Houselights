# Houselights

A small app that builds a Spotify playlist from the artists you're about to see live.
Search for an artist, add them to your lineup, set how many songs you want from each
(popular / recent / deep cuts, plus specific hand-picked tracks), preview and reorder
the full playlist, then create it directly in your Spotify account.

Built for a single user for now — see the notes on Spotify's development mode below.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Spotify Web API (Authorization Code flow, server-side, cookie-based session)
- Deploys to Cloudflare Workers via `@opennextjs/cloudflare`

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

## 4. Deploy to Cloudflare

This project uses `@opennextjs/cloudflare`, the adapter currently recommended for
running full Next.js apps (including API routes) on Cloudflare Workers.

```
npm run cf:build
npx wrangler login
npx wrangler secret put SPOTIFY_CLIENT_ID
npx wrangler secret put SPOTIFY_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
```

Then set `SPOTIFY_REDIRECT_URI` and `APP_URL` as plain vars in `wrangler.jsonc`
(or as secrets too) pointing at your `*.workers.dev` or custom domain, add that
same redirect URI in the Spotify dashboard, and deploy:

```
npm run cf:deploy
```

Once deployed, visiting the site on your phone and using "Add to Home Screen"
installs it as a PWA (manifest + service worker are already wired up in `public/`).

## How playlist generation works

For each artist in your lineup:

- **Most popular** — Spotify's artist top-tracks endpoint, sorted by popularity.
- **Recent** — pulls the artist's full album/single catalog and sorts by release date.
- **Deep cuts** — same catalog pull, sorted by popularity ascending, so the biggest
  hits sink to the bottom.
- **Add specific songs** — a plain track search scoped to that artist, added on top
  of (or instead of) the automatic picks.

The count you set per artist (defaults: 20 for the first artist you add, 10 for the
rest — tweak as needed) controls how many auto-selected tracks are pulled in per
filter. Everything is combined into one list on the preview screen, where you can
remove, reorder (drag the handle), or add more before creating the playlist.

## Known limitations / next steps

- Deep cuts and Recent fetch a fair number of Spotify endpoints per artist
  (albums → album tracks → track details for popularity), so building a large
  lineup can take a few seconds. Worth adding a loading state per artist if this
  becomes annoying in practice.
- No offline queueing of playlist creation — the service worker caches pages for
  fast reloads, but creating a playlist still requires a live connection.
- Cover image upload is best-effort: if it fails, the playlist is still created
  without a custom cover rather than blocking the whole flow.
- Spotify's development mode currently caps you at 5 allowlisted users and requires
  the app owner to have Premium — fine for solo use, but worth knowing about before
  sharing this with friends.
