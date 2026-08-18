import { getTokens, setTokens, StoredTokens } from "./session";
import { SpotifyArtist, SpotifyTrack, FilterType } from "./types";
import { getEnv } from "./env";
import { resolveArtistMbidCandidates, findArtistSetlistTitles } from "./setlistfm";

// NOTE: Spotify's February 2026 Development Mode changes removed several
// endpoints this app used to rely on (artist top-tracks, batch track/album
// fetches, the old playlist-for-user creation flow) and dropped the
// `popularity` field from track/album/artist responses entirely. Everything
// below is written against the *current* (post-migration) API surface.
// See: https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

function basicAuthHeader() {
  const id = getEnv("SPOTIFY_CLIENT_ID")!;
  const secret = getEnv("SPOTIFY_CLIENT_SECRET")!;
  return "Basic " + btoa(`${id}:${secret}`);
}

export function getAuthorizeUrl(state: string, forceDialog = false) {
  const scopes = [
    "playlist-modify-public",
    "playlist-modify-private",
    "playlist-read-private",
    "ugc-image-upload",
    "user-read-private",
  ].join(" ");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getEnv("SPOTIFY_CLIENT_ID")!,
    scope: scopes,
    redirect_uri: getEnv("SPOTIFY_REDIRECT_URI")!,
    state,
  });
  if (forceDialog) params.set("show_dialog", "true");
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<StoredTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getEnv("SPOTIFY_REDIRECT_URI")!,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  const json = await res.json();
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

async function refreshAccessToken(refreshToken: string): Promise<StoredTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const json = await res.json();
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getTokens();
  if (!tokens) return null;
  if (Date.now() < tokens.expiresAt - 30_000) return tokens.accessToken;
  const refreshed = await refreshAccessToken(tokens.refreshToken);
  await setTokens(refreshed);
  return refreshed.accessToken;
}

async function spotifyFetch(path: string, accessToken: string, init: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") || "1");
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return spotifyFetch(path, accessToken, init);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function searchArtists(query: string, accessToken: string): Promise<SpotifyArtist[]> {
  const params = new URLSearchParams({ q: query, type: "artist", limit: "3" });
  const json = await spotifyFetch(`/search?${params.toString()}`, accessToken);
  return (json.artists?.items || []).map((a: any) => ({
    id: a.id,
    name: a.name,
    genres: a.genres || [],
    image: a.images?.[a.images.length - 1]?.url,
  }));
}

function mapTrack(t: any, artistId: string, album?: any): SpotifyTrack {
  return {
    id: t.id,
    uri: t.uri,
    name: t.name,
    artist: t.artists?.[0]?.name || "",
    artistId,
    album: album?.name || t.album?.name || "",
    albumImage: (album?.images || t.album?.images)?.[album?.images?.length - 1 || 0]?.url,
    durationMs: t.duration_ms,
    // `popularity` no longer exists in Spotify's response for Development
    // Mode apps as of Feb 2026 — kept as 0 for type compatibility only,
    // never used for sorting anymore.
    popularity: 0,
    releaseDate: album?.release_date || t.album?.release_date,
  };
}

// GET /artists/{id}/top-tracks was removed entirely, and — as of testing in
// August 2026 — GET /artists/{id}/albums (and by extension the whole catalog
// browsing path this app used to rely on) now returns a misleading 400
// "Invalid limit" error for Development Mode apps specifically. The real
// cause isn't a bad parameter; Spotify has gated bulk catalog browsing
// behind Extended Quota Mode, which requires being a registered
// organization with 250k+ monthly active users — not achievable for a
// personal app. So: no catalog endpoints anywhere below. Everything is
// built from GET /search, which is confirmed working, using different
// slices of it as proxies for "popular," "recent," and "deep cuts."
async function searchArtistTrackRange(
  artistId: string,
  accessToken: string,
  query: string,
  offsetStart: number,
  offsetEnd: number
): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  const seen = new Set<string>();
  for (let offset = offsetStart; offset < offsetEnd; offset += 10) {
    const params = new URLSearchParams({ q: query, type: "track", limit: "10", offset: String(offset) });
    const json = await spotifyFetch(`/search?${params.toString()}`, accessToken);
    const items = json.tracks?.items || [];
    if (items.length === 0) break;
    for (const t of items) {
      if (t.artists?.length && !t.artists.some((a: any) => a.id === artistId)) continue;
      const mapped = mapTrack(t, artistId);
      const key = trackDedupeKey(mapped);
      if (seen.has(key)) continue;
      seen.add(key);
      tracks.push(mapped);
    }
    if (items.length < 10) break;
  }
  return tracks;
}

// "Most popular" — the first several pages of plain relevance-ranked search
// results. Search still ranks by relevance internally even with the score
// hidden, so early results are the closest available popularity proxy.
// Paged to 50 rather than 30 — a prolific artist's relevance results often
// contain near-duplicates (remasters, deluxe reissues) that dedup collapses
// away, so a shallower page count under-fills before it even gets to
// genuinely distinct tracks.
export async function getArtistKnownTracks(artistId: string, artistName: string, accessToken: string): Promise<SpotifyTrack[]> {
  return searchArtistTrackRange(artistId, accessToken, `artist:"${artistName}"`, 0, 50);
}

// A second, differently-shaped query used only to top up a pool that's
// still short after the field-restricted artist:"Name" search above.
// Spotify's search ranks field-restricted queries (artist:"X") and plain
// free-text queries (just the artist's name) somewhat differently, so this
// genuinely surfaces additional distinct tracks sometimes, rather than
// just re-finding the same ones — worth the extra request only when
// there's an actual shortfall to fill.
async function getArtistSupplementalTracks(artistId: string, artistName: string, accessToken: string): Promise<SpotifyTrack[]> {
  return searchArtistTrackRange(artistId, accessToken, artistName, 0, 50);
}

// "Setlist" — resolves what this artist has actually been playing live
// recently, via setlist.fm, then matches each song title back to a real
// Spotify track, in the same order the titles arrived in (Promise.all
// preserves input order regardless of which request actually finishes
// first) — so if titles is in real performance order, so is this pool.
// Titles that don't cleanly resolve (typos, live-only mashups, songs
// setlist.fm has but Spotify's search can't match) are just skipped
// rather than failing the whole pool.
async function getArtistSetlistTracks(artistId: string, artistName: string, accessToken: string): Promise<SpotifyTrack[]> {
  const candidates = await resolveArtistMbidCandidates(artistName);
  if (candidates.length === 0) return [];
  const titles = await findArtistSetlistTitles(candidates);
  if (titles.length === 0) return [];

  const seen = new Set<string>();
  const tracks: SpotifyTrack[] = [];
  const resolved = await Promise.all(
    titles.map(async (title) => {
      try {
        const params = new URLSearchParams({ q: `track:${title} artist:${artistName}`, type: "track", limit: "5" });
        const json = await spotifyFetch(`/search?${params.toString()}`, accessToken);
        const items: any[] = json.tracks?.items || [];
        const match = items.find((t) => t.artists?.some((a: any) => a.id === artistId));
        return match ? mapTrack(match, artistId) : null;
      } catch {
        return null; // one bad title shouldn't sink the whole setlist lookup
      }
    })
  );
  for (const t of resolved) {
    if (!t) continue;
    const key = trackDedupeKey(t);
    if (seen.has(key)) continue;
    seen.add(key);
    tracks.push(t);
  }
  return tracks;
}

export async function searchTracksForArtist(
  artistId: string,
  artistName: string,
  query: string,
  accessToken: string
): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams({
    q: `track:${query} artist:${artistName}`,
    type: "track",
    limit: "10",
  });
  const json = await spotifyFetch(`/search?${params.toString()}`, accessToken);
  // The same song often appears multiple times (album version, single,
  // deluxe reissue, remaster) — dedupe so "Add specific songs" shows each
  // distinct title once, keeping the first (most relevant) match.
  const seen = new Set<string>();
  const tracks: SpotifyTrack[] = [];
  for (const t of json.tracks?.items || []) {
    const mapped = mapTrack(t, artistId);
    const key = trackDedupeKey(mapped);
    if (seen.has(key)) continue;
    seen.add(key);
    tracks.push(mapped);
  }
  return tracks;
}

// GET /tracks (batch) was removed — fetch each track individually instead.
export async function getTracksByIds(ids: string[], accessToken: string): Promise<SpotifyTrack[]> {
  if (ids.length === 0) return [];
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const t = await spotifyFetch(`/tracks/${id}`, accessToken);
        return mapTrack(t, t.artists?.[0]?.id || "");
      } catch {
        return null;
      }
    })
  );
  return results.filter((t): t is SpotifyTrack => t !== null);
}

function trackDedupeKey(t: SpotifyTrack): string {
  return t.name.toLowerCase().replace(/\(.*?\)/g, "").trim() + "|" + t.artistId;
}

// Both pools already arrive in a meaningful order (relevance for popular,
// most-recent-shows-first for setlist), so there's nothing left to re-sort
// here — this used to re-sort "recent" by `releaseDate`, but that field
// only ever came from the now-dead catalog path and is no longer populated.
function sortForFilter(tracks: SpotifyTrack[], _filter: FilterType): SpotifyTrack[] {
  return tracks;
}

export interface ArtistPoolsResult {
  pools: Record<FilterType, SpotifyTrack[]>;
  supplemental: SpotifyTrack[];
  warning?: string;
}

export async function getArtistTrackPools(
  artistId: string,
  artistName: string,
  accessToken: string
): Promise<ArtistPoolsResult> {
  const [popularResult, setlistResult, supplementalResult] = await Promise.allSettled([
    getArtistKnownTracks(artistId, artistName, accessToken),
    getArtistSetlistTracks(artistId, artistName, accessToken),
    getArtistSupplementalTracks(artistId, artistName, accessToken),
  ]);

  const popular = popularResult.status === "fulfilled" ? popularResult.value : [];
  const setlist = setlistResult.status === "fulfilled" ? setlistResult.value : [];
  const supplemental = supplementalResult.status === "fulfilled" ? supplementalResult.value : [];

  const failures: string[] = [];
  if (popularResult.status === "rejected") {
    failures.push(`popular lookup failed (${popularResult.reason?.message || popularResult.reason})`);
  }
  if (setlistResult.status === "rejected") {
    failures.push(`setlist lookup failed (${setlistResult.reason?.message || setlistResult.reason})`);
  }
  // A failed supplemental fetch isn't worth surfacing as a warning — it was
  // only ever a top-up source, and the primary pools already cover the
  // actual filter selections.

  return {
    pools: { popular, setlist },
    supplemental,
    warning: failures.length > 0 ? failures.join("; ") : undefined,
  };
}

export function selectTracksForFilters(
  poolsByFilter: Record<FilterType, SpotifyTrack[]>,
  filters: FilterType[],
  count: number,
  supplemental: SpotifyTrack[] = []
): { tracks: SpotifyTrack[]; shortBy: number } {
  const active = filters.length > 0 ? filters : (["popular"] as FilterType[]);
  const base = Math.floor(count / active.length);
  const remainder = count - base * active.length;

  const selected: SpotifyTrack[] = [];
  const seen = new Set<string>();

  active.forEach((filter, i) => {
    const target = base + (i < remainder ? 1 : 0);
    const sorted = sortForFilter(poolsByFilter[filter] || [], filter);
    let added = 0;
    for (const t of sorted) {
      if (added >= target) break;
      const key = trackDedupeKey(t);
      if (seen.has(key)) continue;
      seen.add(key);
      selected.push(t);
      added++;
    }
  });

  // if a filter's pool ran out early, top up from whatever's left so the
  // total still hits `count` — first from the other selected pools, then
  // from the supplemental broader-query pool if it's still short after
  // that. `shortBy` reports exactly how far short it still is if even that
  // combined material genuinely doesn't have enough distinct tracks, so
  // that can be surfaced instead of silently under-filling.
  if (selected.length < count) {
    const fallback = [...poolsByFilter.popular, ...poolsByFilter.setlist, ...supplemental];
    for (const t of fallback) {
      if (selected.length >= count) break;
      const key = trackDedupeKey(t);
      if (seen.has(key)) continue;
      seen.add(key);
      selected.push(t);
    }
  }

  return { tracks: selected, shortBy: Math.max(0, count - selected.length) };
}

// Fetches every track currently in a playlist (paginated — GET
// /playlists/{id}/tracks caps at 100 items per page, and playlists can
// have more). Used by "Preview" on an existing playlist to reload its
// actual songs back into the app, since the app's own local history never
// stored individual tracks — only aggregate counts. Each track's
// `sourceArtistId` is set from its own primary Spotify artist, since
// there's no way to recover which of the original lineup's artists it was
// originally attributed to (relevant for a feature/collab track).
export async function getPlaylistTracks(playlistId: string, accessToken: string): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  let url = `/playlists/${playlistId}/tracks?limit=100&fields=next,items(track(id,uri,name,duration_ms,album(images),artists(id,name)))`;
  while (url) {
    const json = await spotifyFetch(url, accessToken);
    for (const item of json.items || []) {
      const t = item.track;
      if (!t || !t.id) continue; // local files / removed tracks have no id
      const primaryArtist = t.artists?.[0];
      tracks.push({
        id: t.id,
        uri: t.uri,
        name: t.name,
        artist: primaryArtist?.name || "Unknown",
        artistId: primaryArtist?.id || "",
        album: "",
        albumImage: t.album?.images?.[0]?.url,
        durationMs: t.duration_ms || 0,
        popularity: 0,
      });
    }
    // `next` comes back as a full absolute URL from Spotify; spotifyFetch
    // expects a path relative to API_BASE, so strip that prefix off.
    url = json.next ? json.next.replace(API_BASE, "") : "";
  }
  return tracks;
}

async function uploadPlaylistCover(playlistId: string, accessToken: string, coverImageBase64: string) {
  let coverUploaded = false;
  let coverErrorStatus: number | undefined;
  let coverErrorBody: string | undefined;
  try {
    const coverRes = await fetch(`${API_BASE}/playlists/${playlistId}/images`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "image/jpeg",
      },
      body: coverImageBase64,
    });
    if (coverRes.ok) {
      coverUploaded = true;
    } else {
      // Cover upload is best-effort — the playlist itself still succeeds
      // without one — but a silent catch() here previously meant this
      // failure (over Spotify's 256KB/JPEG-only limit, a stale token,
      // etc.) never surfaced anywhere, not even in logs. Now it's
      // captured here directly rather than only in server logs, which
      // require live-tailing Cloudflare's dashboard to ever see.
      coverErrorStatus = coverRes.status;
      coverErrorBody = (await coverRes.text().catch(() => "")).slice(0, 200);
      console.error("Cover image upload failed", coverErrorStatus, coverErrorBody);
    }
  } catch (err: any) {
    coverErrorBody = err?.message || "network error";
    console.error("Cover image upload threw", err);
  }
  return { coverUploaded, coverErrorStatus, coverErrorBody };
}

export async function createSpotifyPlaylist(params: {
  accessToken: string;
  name: string;
  description: string;
  trackUris: string[];
  coverImageBase64?: string;
}) {
  // POST /users/{user_id}/playlists was removed — POST /me/playlists creates
  // it for the logged-in user directly, no need to look up a user id first.
  const playlist = await spotifyFetch(`/me/playlists`, params.accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: params.name,
      description: params.description,
      public: false,
    }),
  });

  // POST /playlists/{id}/tracks was renamed to /playlists/{id}/items.
  for (let i = 0; i < params.trackUris.length; i += 100) {
    const chunk = params.trackUris.slice(i, i + 100);
    await spotifyFetch(`/playlists/${playlist.id}/items`, params.accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uris: chunk }),
    });
  }

  const cover = params.coverImageBase64
    ? await uploadPlaylistCover(playlist.id, params.accessToken, params.coverImageBase64)
    : { coverUploaded: false, coverErrorStatus: undefined, coverErrorBody: undefined };

  return {
    id: playlist.id,
    url: playlist.external_urls?.spotify as string,
    ...cover,
  };
}

// Updates an existing playlist in place, rather than creating a new one —
// used by "Save changes" when a playlist was loaded via Edit. Spotify's
// February 2026 changes renamed PUT /playlists/{id}/tracks (the "replace
// all items" endpoint) to PUT /playlists/{id}/items; that rename is easy
// to miss since the POST (append) variant at the same new path already
// existed and worked, so this could look like it's working when it's
// actually silently hitting the old, now-removed path.
export async function updateSpotifyPlaylist(params: {
  accessToken: string;
  playlistId: string;
  name: string;
  description: string;
  trackUris: string[];
  coverImageBase64?: string;
}) {
  await spotifyFetch(`/playlists/${params.playlistId}`, params.accessToken, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: params.name, description: params.description }),
  });

  // Replacing with an empty array has been reported to 502 on Spotify's
  // side — the UI is expected to block saving an empty playlist before it
  // ever reaches here, but this guard avoids hitting that specific
  // failure mode even if that validation is ever bypassed.
  if (params.trackUris.length > 0) {
    const first100 = params.trackUris.slice(0, 100);
    await spotifyFetch(`/playlists/${params.playlistId}/items`, params.accessToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uris: first100 }),
    });

    for (let i = 100; i < params.trackUris.length; i += 100) {
      const chunk = params.trackUris.slice(i, i + 100);
      await spotifyFetch(`/playlists/${params.playlistId}/items`, params.accessToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uris: chunk }),
      });
    }
  }

  const cover = params.coverImageBase64
    ? await uploadPlaylistCover(params.playlistId, params.accessToken, params.coverImageBase64)
    : { coverUploaded: false, coverErrorStatus: undefined, coverErrorBody: undefined };

  return {
    id: params.playlistId,
    url: `https://open.spotify.com/playlist/${params.playlistId}`,
    ...cover,
  };
}
