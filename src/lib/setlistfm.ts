// setlist.fm REST API client. Verified against their published docs
// (https://api.setlist.fm/docs/1.0/index.html) as of building this —
// base URL, auth header, and response shapes below are the real ones, not
// guessed. Two things worth knowing:
//
// 1. setlist.fm indexes artists by MusicBrainz ID (MBID), not Spotify ID,
//    so every lookup here starts with a name-based search to resolve one.
//    That's a real (if fairly rare) mismatch risk — a name search can
//    return the wrong act for an ambiguous name.
// 2. Their API explicitly does not support CORS — it's designed to be
//    called server-side only, which is exactly how this file is used (only
//    from edge API routes, never from client components).
//
// Requires a SETLISTFM_API_KEY — free to get, but requires signing up for
// a setlist.fm account and applying for a key; not something that can be
// provisioned automatically. Set it as an environment variable the same
// way SPOTIFY_CLIENT_ID etc. are set.

import { getEnv } from "./env";

const BASE = "https://api.setlist.fm/rest/1.0";

function requireApiKey(): string {
  const key = getEnv("SETLISTFM_API_KEY");
  if (!key) throw new Error("Setlist data isn't set up yet — add a SETLISTFM_API_KEY to enable it.");
  return key;
}

async function setlistFetch(path: string): Promise<any> {
  const apiKey = requireApiKey();
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-api-key": apiKey, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`setlist.fm request failed (${res.status})`);
  }
  return res.json();
}

// Resolves a Spotify artist name to a setlist.fm MBID. Prefers an exact
// (case-insensitive) name match over setlist.fm's own result ordering,
// since their relevance ranking doesn't always put the right act first for
// a common name — but falls back to the top result if nothing matches
// exactly, rather than giving up.
export async function resolveArtistMbid(artistName: string): Promise<string | null> {
  const params = new URLSearchParams({ artistName, sort: "relevance" });
  const json = await setlistFetch(`/search/artists?${params.toString()}`);
  const candidates: any[] = json.artist || [];
  if (candidates.length === 0) return null;
  const exact = candidates.find((a) => a.name?.toLowerCase() === artistName.toLowerCase());
  return (exact || candidates[0]).mbid || null;
}

// Aggregates song titles across the artist's most recent setlists (not
// just the single latest show) — a few shows in, more representative of
// the current tour than any one night's set, and resilient to one show
// being an unusually short or acoustic-only outlier.
export async function getRecentSetlistSongTitles(mbid: string, maxShows = 5): Promise<string[]> {
  const json = await setlistFetch(`/artist/${mbid}/setlists?p=1`);
  const setlists: any[] = json.setlist || [];

  const titles: string[] = [];
  const seen = new Set<string>();
  let showsUsed = 0;

  for (const setlist of setlists) {
    if (showsUsed >= maxShows) break;
    const sets: any[] = setlist.set || [];
    const songNames = sets.flatMap((s) => (s.song || []).map((song: any) => song.name).filter(Boolean));
    if (songNames.length === 0) continue; // some entries are placeholders with no songs logged yet
    for (const name of songNames) {
      const key = name.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);
      titles.push(name);
    }
    showsUsed++;
  }

  return titles;
}
