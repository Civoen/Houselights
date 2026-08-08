import { getTokens, setTokens, StoredTokens } from "./session";
import { SpotifyArtist, SpotifyTrack, FilterType } from "./types";

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

function basicAuthHeader() {
  const id = process.env.SPOTIFY_CLIENT_ID!;
  const secret = process.env.SPOTIFY_CLIENT_SECRET!;
  return "Basic " + btoa(`${id}:${secret}`);
}

export function getAuthorizeUrl(state: string) {
  const scopes = [
    "playlist-modify-public",
    "playlist-modify-private",
    "ugc-image-upload",
    "user-read-private",
  ].join(" ");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    scope: scopes,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    state,
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<StoredTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
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
  const params = new URLSearchParams({ q: query, type: "artist", limit: "8" });
  const json = await spotifyFetch(`/search?${params.toString()}`, accessToken);
  return (json.artists?.items || []).map((a: any) => ({
    id: a.id,
    name: a.name,
    genres: a.genres || [],
    image: a.images?.[a.images.length - 1]?.url,
    followers: a.followers?.total,
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
    popularity: t.popularity ?? 0,
    releaseDate: album?.release_date || t.album?.release_date,
  };
}

export async function getArtistTopTracks(artistId: string, accessToken: string): Promise<SpotifyTrack[]> {
  const json = await spotifyFetch(`/artists/${artistId}/top-tracks?market=US`, accessToken);
  return (json.tracks || []).map((t: any) => mapTrack(t, artistId));
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

export async function getArtistCatalog(artistId: string, accessToken: string): Promise<SpotifyTrack[]> {
  const albumsJson = await spotifyFetch(
    `/artists/${artistId}/albums?include_groups=album,single&limit=50&market=US`,
    accessToken
  );
  const albums = albumsJson.items || [];
  const seenNames = new Set<string>();
  const tracks: SpotifyTrack[] = [];

  for (const album of albums.slice(0, 12)) {
    if (seenNames.has(album.name.toLowerCase())) continue;
    seenNames.add(album.name.toLowerCase());
    const tracksJson = await spotifyFetch(`/albums/${album.id}/tracks?limit=50`, accessToken);
    const items = tracksJson.items || [];
    const ids = items.map((t: any) => t.id).filter(Boolean);
    if (ids.length === 0) continue;
    const detailJson = await spotifyFetch(`/tracks?ids=${ids.join(",")}`, accessToken);
    for (const full of detailJson.tracks || []) {
      if (!full) continue;
      tracks.push(mapTrack(full, artistId, album));
    }
  }
  return tracks;
}

export async function getTracksByIds(ids: string[], accessToken: string): Promise<SpotifyTrack[]> {
  if (ids.length === 0) return [];
  const out: SpotifyTrack[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const json = await spotifyFetch(`/tracks?ids=${chunk.join(",")}`, accessToken);
    for (const t of json.tracks || []) {
      if (t) out.push(mapTrack(t, t.artists?.[0]?.id || ""));
    }
  }
  return out;
}

export function filterTracks(tracks: SpotifyTrack[], filter: FilterType, count: number): SpotifyTrack[] {
  const deduped = dedupeByName(tracks);
  let sorted: SpotifyTrack[];
  if (filter === "popular") {
    sorted = [...deduped].sort((a, b) => b.popularity - a.popularity);
  } else if (filter === "deep") {
    sorted = [...deduped].sort((a, b) => a.popularity - b.popularity);
  } else {
    sorted = [...deduped].sort((a, b) => {
      const da = a.releaseDate ? Date.parse(a.releaseDate) : 0;
      const db = b.releaseDate ? Date.parse(b.releaseDate) : 0;
      return db - da;
    });
  }
  return sorted.slice(0, count);
}

function dedupeByName(tracks: SpotifyTrack[]): SpotifyTrack[] {
  const seen = new Set<string>();
  const out: SpotifyTrack[] = [];
  for (const t of tracks) {
    const key = t.name.toLowerCase().replace(/\(.*?\)/g, "").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export async function createSpotifyPlaylist(params: {
  accessToken: string;
  name: string;
  description: string;
  trackUris: string[];
  coverImageBase64?: string;
}) {
  const me = await spotifyFetch("/me", params.accessToken);
  const playlist = await spotifyFetch(`/users/${me.id}/playlists`, params.accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: params.name,
      description: params.description,
      public: false,
    }),
  });

  for (let i = 0; i < params.trackUris.length; i += 100) {
    const chunk = params.trackUris.slice(i, i + 100);
    await spotifyFetch(`/playlists/${playlist.id}/tracks`, params.accessToken, {
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
