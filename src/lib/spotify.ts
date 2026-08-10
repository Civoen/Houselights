import { getTokens, setTokens, StoredTokens } from "./session";
import { SpotifyArtist, SpotifyTrack, FilterType } from "./types";
import { getEnv } from "./env";

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

// "Most popular" — the first couple pages of plain relevance-ranked search
// results. Search still ranks by relevance internally even with the score
// hidden, so early results are the closest available popularity proxy.
export async function getArtistKnownTracks(artistId: string, artistName: string, accessToken: string): Promise<SpotifyTrack[]> {
  return searchArtistTrackRange(artistId, accessToken, `artist:"${artistName}"`, 0, 30);
}

// "Recent" — the same search, but scoped with Spotify's year: filter to the
// last couple of years, which is a real recency signal rather than a guess.
async function getArtistRecentTracks(artistId: string, artistName: string, accessToken: string): Promise<SpotifyTrack[]> {
  const currentYear = new Date().getFullYear();
  const query = `artist:"${artistName}" year:${currentYear - 2}-${currentYear}`;
  return searchArtistTrackRange(artistId, accessToken, query, 0, 20);
}

// "Deep cuts" — later pages of the same plain search. Relevance ranking
// degrades the further you page in, so results here are, on average,
// genuinely less prominent than the "popular" slice — not a perfect
// popularity-ascending sort (that data doesn't exist anymore), but a real,
// distinct pool rather than a re-labeled copy of "popular."
async function getArtistDeepTracks(artistId: string, artistName: string, accessToken: string): Promise<SpotifyTrack[]> {
  return searchArtistTrackRange(artistId, accessToken, `artist:"${artistName}"`, 30, 80);
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

// All three pools already arrive in a meaningful order (relevance for
// popular/deep, actual recency for recent via the year: filter), so there's
// nothing left to re-sort here — this used to re-sort "recent" by
// `releaseDate`, but that field only ever came from the now-dead catalog
// path and is no longer populated.
function sortForFilter(tracks: SpotifyTrack[], _filter: FilterType): SpotifyTrack[] {
  return tracks;
}

export interface ArtistPoolsResult {
  pools: Record<FilterType, SpotifyTrack[]>;
  warning?: string;
}

export async function getArtistTrackPools(
  artistId: string,
  artistName: string,
  accessToken: string
): Promise<ArtistPoolsResult> {
  const [popularResult, recentResult, deepResult] = await Promise.allSettled([
    getArtistKnownTracks(artistId, artistName, accessToken),
    getArtistRecentTracks(artistId, artistName, accessToken),
    getArtistDeepTracks(artistId, artistName, accessToken),
  ]);

  const popular = popularResult.status === "fulfilled" ? popularResult.value : [];
  const recent = recentResult.status === "fulfilled" ? recentResult.value : [];
  const deep = deepResult.status === "fulfilled" ? deepResult.value : [];

  const failures: string[] = [];
  if (popularResult.status === "rejected") {
    failures.push(`popular lookup failed (${popularResult.reason?.message || popularResult.reason})`);
  }
  if (recentResult.status === "rejected") {
    failures.push(`recent lookup failed (${recentResult.reason?.message || recentResult.reason})`);
  }
  if (deepResult.status === "rejected") {
    failures.push(`deep cuts lookup failed (${deepResult.reason?.message || deepResult.reason})`);
  }

  return {
    pools: { popular, recent, deep },
    warning: failures.length > 0 ? failures.join("; ") : undefined,
  };
}

export function selectTracksForFilters(
  poolsByFilter: Record<FilterType, SpotifyTrack[]>,
  filters: FilterType[],
  count: number
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
  // total still hits `count` — but if the combined pool genuinely doesn't
  // have enough distinct tracks, `shortBy` reports exactly how far short,
  // so that can be surfaced instead of silently under-filling.
  if (selected.length < count) {
    const fallback = [...poolsByFilter.popular, ...poolsByFilter.recent, ...poolsByFilter.deep];
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

  if (params.coverImageBase64) {
    await fetch(`${API_BASE}/playlists/${playlist.id}/images`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "image/jpeg",
      },
      body: params.coverImageBase64,
    }).catch(() => {
      /* cover upload is best-effort; playlist creation still succeeds without it */
    });
  }

  return { id: playlist.id, url: playlist.external_urls?.spotify as string };
}
