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
    "user-top-read",
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

// GET /me/top/{type} is one of the few personalization endpoints still
// available for Development Mode apps post Feb-2026 changes. Requires the
// user-top-read scope — accounts that connected before this scope was added
// will need to reconnect once for this to start working.
export async function getTopArtists(accessToken: string, limit = 8): Promise<SpotifyArtist[]> {
  const params = new URLSearchParams({ limit: String(limit), time_range: "medium_term" });
  const json = await spotifyFetch(`/me/top/artists?${params.toString()}`, accessToken);
  return (json.items || []).map((a: any) => ({
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

// Spotify's Feb 2026 changes removed `country` from GET /me, so there's no
// way to read the account's real market anymore. US is a broad, safe default.
export async function getUserMarket(_accessToken: string): Promise<string> {
  return "US";
}

// GET /artists/{id}/top-tracks was removed entirely. There is no direct
// per-artist "top tracks" endpoint left in the API for Development Mode
// apps, so this approximates it using Search's relevance ordering, which
// still correlates with popularity even though the score itself is hidden.
export async function getArtistKnownTracks(
  artistId: string,
  artistName: string,
  accessToken: string,
  maxTracks = 30
): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  const seen = new Set<string>();
  for (let offset = 0; offset < maxTracks; offset += 10) {
    const params = new URLSearchParams({
      q: `artist:"${artistName}"`,
      type: "track",
      limit: "10",
      offset: String(offset),
    });
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
  return (json.tracks?.items || []).map((t: any) => mapTrack(t, artistId));
}

// GET /artists/{id}/albums and GET /albums/{id}/tracks are both still
// available. The old version of this function also called the now-removed
// batch GET /tracks?ids=... just to fetch `popularity` — since that field
// no longer exists anywhere, that extra round-trip is gone too.
export async function getArtistCatalog(artistId: string, accessToken: string, market = "US"): Promise<SpotifyTrack[]> {
  const albumsJson = await spotifyFetch(
    `/artists/${artistId}/albums?include_groups=album,single&limit=50&market=${market}`,
    accessToken
  );
  const albums = albumsJson.items || [];
  const seenNames = new Set<string>();
  const uniqueAlbums: any[] = [];
  for (const album of albums) {
    const key = album.name.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    uniqueAlbums.push(album);
    if (uniqueAlbums.length >= 12) break;
  }

  const perAlbum = await Promise.all(
    uniqueAlbums.map(async (album) => {
      try {
        const tracksJson = await spotifyFetch(`/albums/${album.id}/tracks?limit=50`, accessToken);
        return (tracksJson.items || []).map((t: any) => mapTrack(t, artistId, album));
      } catch {
        return [] as SpotifyTrack[];
      }
    })
  );
  return perAlbum.flat();
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

function sortForFilter(tracks: SpotifyTrack[], filter: FilterType): SpotifyTrack[] {
  if (filter === "recent") {
    return [...tracks].sort((a, b) => {
      const da = a.releaseDate ? Date.parse(a.releaseDate) : 0;
      const db = b.releaseDate ? Date.parse(b.releaseDate) : 0;
      return db - da;
    });
  }
  // "popular" (search-relevance order) and "deep" (catalog order, already
  // excludes known/popular tracks — see getArtistTrackPools) both keep the
  // order they arrive in, since there's no popularity score left to sort by.
  return tracks;
}

// Builds one track pool per filter for an artist. Both the search-relevance
// pool and the full catalog are always fetched together — previously
// "popular" only drew from search results and had nothing to fall back on,
// which meant it silently capped out at however many unique tracks search
// returned (often as few as 5 once re-releases/live versions were deduped),
// no matter how many songs were actually requested. Now "popular" leads with
// the search-matched tracks (best available popularity proxy) and pads out
// with the rest of the catalog, so requesting more than the search pool's
// size still returns real, unique songs instead of stalling early.
export interface ArtistPoolsResult {
  pools: Record<FilterType, SpotifyTrack[]>;
  warning?: string;
}

export async function getArtistTrackPools(
  artistId: string,
  artistName: string,
  accessToken: string,
  market = "US"
): Promise<ArtistPoolsResult> {
  const [knownResult, catalogResult] = await Promise.allSettled([
    getArtistKnownTracks(artistId, artistName, accessToken),
    getArtistCatalog(artistId, accessToken, market),
  ]);

  const known = knownResult.status === "fulfilled" ? knownResult.value : [];
  const catalog = catalogResult.status === "fulfilled" ? catalogResult.value : [];

  const failures: string[] = [];
  if (knownResult.status === "rejected") {
    failures.push(`search lookup failed (${knownResult.reason?.message || knownResult.reason})`);
  }
  if (catalogResult.status === "rejected") {
    failures.push(`catalog lookup failed (${catalogResult.reason?.message || catalogResult.reason})`);
  }

  const knownKeys = new Set(known.map(trackDedupeKey));
  const catalogMinusKnown = catalog.filter((t) => !knownKeys.has(trackDedupeKey(t)));

  return {
    pools: {
      popular: [...known, ...catalogMinusKnown],
      recent: catalog,
      deep: catalogMinusKnown.length > 0 ? catalogMinusKnown : catalog,
    },
    warning: failures.length > 0 ? failures.join("; ") : undefined,
  };
}

export function selectTracksForFilters(
  poolsByFilter: Record<FilterType, SpotifyTrack[]>,
  filters: FilterType[],
  count: number
): SpotifyTrack[] {
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
  // total still hits `count`
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

  return selected;
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
