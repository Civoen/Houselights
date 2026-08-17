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
import { copy } from "./copy";

const BASE = "https://api.setlist.fm/rest/1.0";

function requireApiKey(): string {
  const key = getEnv("SETLISTFM_API_KEY");
  if (!key) throw new Error(copy.common.setlistNotConfiguredError);
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

// Song titles from the artist's most recent setlist, in original
// performance order, patched using the next 1-2 most recent shows to
// catch a song that was likely just missed at that one specific night
// (technical issue, time cut) rather than genuinely dropped from
// rotation. A song only gets added back if it appears in *every* other
// checked show, not just one — a single other show having it could just
// as easily be that show's own one-off addition, not a real pattern.
// Nothing is ever removed: a song the most recent show added uniquely is
// left as-is, since that's still genuinely what was just played and
// might be a real, current change to the set rather than an anomaly.
export async function getOrderedSetlistSongTitles(mbid: string, checkShows = 3): Promise<string[]> {
  const json = await setlistFetch(`/artist/${mbid}/setlists?p=1`);
  const setlists: any[] = json.setlist || [];

  const nonEmptyShows: string[][] = [];
  for (const setlist of setlists) {
    if (nonEmptyShows.length >= checkShows) break;
    const sets: any[] = setlist.set || [];
    const titles: string[] = [];
    const seen = new Set<string>();
    for (const s of sets) {
      for (const song of s.song || []) {
        if (!song.name) continue;
        const key = song.name.toLowerCase().trim();
        if (seen.has(key)) continue;
        seen.add(key);
        titles.push(song.name);
      }
    }
    if (titles.length > 0) nonEmptyShows.push(titles); // skip placeholder entries with no songs logged yet
  }

  if (nonEmptyShows.length === 0) return [];

  const [mostRecent, ...others] = nonEmptyShows;
  if (others.length === 0) return mostRecent; // nothing else to check against — just the one show available

  const mostRecentKeys = new Set(mostRecent.map((t) => t.toLowerCase().trim()));

  // How many of the other shows each missing song appears in, requiring
  // it to show up in all of them (not just one) before treating it as a
  // consistent staple worth patching back in.
  const otherCounts = new Map<string, { count: number; title: string }>();
  for (const show of others) {
    const seenInThisShow = new Set<string>();
    for (const title of show) {
      const key = title.toLowerCase().trim();
      if (mostRecentKeys.has(key) || seenInThisShow.has(key)) continue;
      seenInThisShow.add(key);
      const existing = otherCounts.get(key);
      otherCounts.set(key, { count: (existing?.count || 0) + 1, title: existing?.title || title });
    }
  }

  const patched = [...mostRecent];
  for (const { count, title } of otherCounts.values()) {
    if (count >= others.length) patched.push(title);
  }

  return patched;
}

export interface SetlistSummary {
  venue: string;
  city: string;
  songCount: number;
  eventDate: string;
}

// Just the most recent show's venue/city/song count — for the "last played
// X, N songs" callout when adding an artist, as distinct from the track
// pool aggregation above (which deliberately looks across several shows).
export async function getLatestSetlistSummary(mbid: string): Promise<SetlistSummary | null> {
  const json = await setlistFetch(`/artist/${mbid}/setlists?p=1`);
  const setlists: any[] = json.setlist || [];
  for (const setlist of setlists) {
    const sets: any[] = setlist.set || [];
    const songCount = sets.reduce((n, s) => n + (s.song?.length || 0), 0);
    if (songCount === 0) continue; // skip placeholder entries with no songs logged yet
    return {
      venue: setlist.venue?.name || "",
      city: setlist.venue?.city?.name || "",
      songCount,
      eventDate: setlist.eventDate || "",
    };
  }
  return null;
}
