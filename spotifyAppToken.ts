import { getEnv } from "./env";

// A Spotify token that belongs to the app itself, not any specific user —
// obtained via the Client Credentials flow, which Spotify explicitly
// supports for exactly this: server-to-server access to public catalog
// data (search, artist info, top tracks) with no user login involved.
// It cannot touch anything user-specific — reading a library, creating a
// playlist — only the read-only catalog endpoints Guest mode needs.
//
// Cached in module scope. On Cloudflare's Edge runtime this isn't a
// guaranteed cross-request cache the way it would be on a normal
// always-on server — a cold isolate just won't have it yet — so this is
// a best-effort optimization, not a correctness requirement. Worst case,
// a request fetches a fresh token slightly more often than the token's
// actual 1-hour lifetime would allow; it never serves a stale/expired one,
// since expiry is always checked before reuse.
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAppAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const id = getEnv("SPOTIFY_CLIENT_ID")!;
  const secret = getEnv("SPOTIFY_CLIENT_SECRET")!;
  const basic = btoa(`${id}:${secret}`);

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Couldn't get an app-level Spotify token (HTTP ${res.status})`);
  }

  const json: { access_token: string; expires_in: number } = await res.json();
  // Refresh a little early (60s buffer) rather than right at the reported
  // expiry, so a request that starts just before expiry doesn't race a
  // token that goes stale mid-flight.
  cachedToken = { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
  return cachedToken.token;
}
