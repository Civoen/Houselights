# Houselights — "if something breaks, check this first" checklist

Every item here is something that actually went wrong at least once while
building this app, not a hypothetical. Most of these bugs weren't caused by
broken code — they were caused by one file changing without a *related*
file changing alongside it. This doc exists so that coupling doesn't have
to be rediscovered the hard way a second time.

---

## Changing the Worker's public URL or domain

If you rename the Worker, add a custom domain, or otherwise change the URL
the app is actually served from, **all of these need to change together**:

- [ ] `wrangler.jsonc` → `vars.APP_URL`
- [ ] `wrangler.jsonc` → `vars.SPOTIFY_REDIRECT_URI`
- [ ] `wrangler.jsonc` → `name` (if renaming the Worker itself) — and the
      matching `services[0].service` entry a few lines below it, which
      silently keeps pointing at the *old* name if missed
- [ ] Spotify Developer Dashboard → your app → Settings → Redirect URIs
      — add the new one (old one can stay or go)

Symptom if missed: Spotify login fails with `redirect_uri: Not matching
configuration` — the URL in the browser's address bar will show you
exactly what the app is *actually* sending, which is the fastest way to
tell which of the above got missed.

---

## Changing the logo / app icon

One visual asset, but it exists as **six separate files**, and nothing
enforces them staying in sync:

- [ ] `src/app/icon.png` (512×512) — browser tab favicon
- [ ] `src/app/favicon.ico` — legacy fallback, same source
- [ ] `src/app/apple-icon.png` (180×180) — **this one specifically** is
      what iOS Safari uses for "Add to Home Screen." Not `icon.png`. This
      was the actual bug the first time this was reported.
- [ ] `public/icons/icon-192.png`
- [ ] `public/icons/icon-512.png`
- [ ] `public/icons/icon-maskable-512.png` — needs the artwork to sit
      within the inner ~80% "safe zone" of the canvas, since Android can
      crop this into a circle/squircle

Symptom if missed: the browser tab looks right but the Home Screen icon
(iOS) or install icon (Android) still shows the old one. iOS also caches
the touch icon aggressively — if it doesn't update after fixing the file,
remove the Home Screen icon, clear Safari's site data, and re-add it
before assuming the fix didn't work.

---

## Adding a new required API key (Setlist.fm, Anthropic/poster upload, etc.)

- [ ] Cloudflare dashboard → Workers & Pages → houselights-reborn →
      Settings → Variables and Secrets → **exact** variable name match
      (case-sensitive — `SETLISTFM_API_KEY`, not `SetlistFmApiKey` or
      similar)
- [ ] Added as a **Secret**, not a plain-text Variable, for anything that
      grants API billing access (Anthropic key) or could be abused if
      leaked (setlist.fm key less critical, but same pattern either way)
- [ ] Triggered a fresh deploy afterward — env var changes need a
      redeploy to actually take effect
- [ ] Confirm the key itself is active — some third-party APIs
      (setlist.fm in particular) require manual approval after signup;
      a freshly-created key isn't guaranteed to work immediately

Never put a real key's value directly into `.env.example` "just for a
minute" — that file is tracked and not gitignored. If this ever happens
by accident, treat the key as burned and rotate it, even if it never
actually got pushed.

---

## Cloudflare Workers Build settings (the dashboard, not the code)

These live in Cloudflare's dashboard, not in the repo, so they're easy to
forget exist at all:

- [ ] **Build command** must be `npx opennextjs-cloudflare build` — the
      generic Next.js default (`npm run build`) only runs `next build`
      and never produces the `.open-next/` folder, which the deploy step
      needs. Symptom: build succeeds, deploy fails with `Could not find
      compiled Open Next config`.
- [ ] **Deploy command** should be `npx wrangler deploy`.

---

## `wrangler.jsonc` is still JSON underneath

It's JSONC (JSON + comments), but a single stray character anywhere in
the file — an extra quote, a trailing comma — breaks the *entire* file's
parsing, and the error message points at a line number, not always the
actual character. If wrangler throws a `ParseError` on this file, read
the exact `lineText` in the error output character-by-character rather
than skimming it.

---

## Reading environment variables in code

Always go through `getEnv()` in `src/lib/env.ts` — never `process.env`
directly. This app runs on Cloudflare Workers via `@opennextjs/cloudflare`,
not a normal Node server, and plain `process.env` doesn't reliably see
vars/secrets bound to the Worker. `getEnv()` already handles this via
`getCloudflareContext()` with a fallback. If a new API integration is
ever added, use the same helper rather than reading `process.env`
directly again.

---

## Uploading files to GitHub via the web UI (not git)

- [ ] Check the file count is under 100 (GitHub's hard cap on a
      drag-and-drop upload)
- [ ] Hidden dotfiles (`.gitignore`, `.env.example`, `.npmrc`, etc.) are
      invisible in a normal Finder/Explorer drag — both hide dotfiles by
      default. Reveal them first (Cmd+Shift+. on Mac) or they'll silently
      not get uploaded at all.
- [ ] **Verify the drop preserved folder structure** before committing.
      A folder drag can occasionally nest everything under an extra
      wrapper folder (e.g. `houselights-tweaks-v2/src/...` instead of
      just `src/...`) instead of merging into the existing paths — this
      actually happened once. After committing, click into a couple of
      the changed files on GitHub itself and confirm they're at the path
      you expect, with the content you expect, before triggering a
      deploy.

---

## Connecting a custom domain (Squarespace, or any registrar, → Cloudflare)

**Domain Forwarding is not the same as connecting the domain.** Forwarding
is a plain HTTP redirect — visitors get bounced to the `.workers.dev` URL
and the address bar changes to show it, which defeats the point and
doesn't actually serve the app *as* the custom domain.

The real path:
1. Cloudflare dashboard → Add a domain → **Connect a domain** (not
   Transfer, not Buy)
2. Change the domain's nameservers at the registrar to the two Cloudflare
   gives you (registration itself stays where it is — this only moves
   DNS management)
3. Wait for propagation (Cloudflare will show the zone as Active once
   it's done — can take minutes to ~48 hours)
4. Workers & Pages → your Worker → Settings → Domains & Routes → Add →
   Custom Domain
5. Then work through the **"Changing the Worker's public URL"** section
   above, since this *is* that situation

---

## Shipping a batch of changes

- [ ] Update `src/lib/patchNotes.ts` — add a new entry at the **top** of
      the array. This file doesn't update itself, and it's easy to ship
      several rounds of real changes before noticing it's gone stale.
