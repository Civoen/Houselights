"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLineup } from "@/lib/lineupStore";
import { Stepper } from "@/components/Stepper";
import { FilterChips } from "@/components/FilterChips";
import { GradientButton } from "@/components/GradientButton";
import { SpotifyArtist, PlaylistTrack } from "@/lib/types";

export default function LineupPage() {
  const router = useRouter();
  const { lineup, addArtist, removeArtist, setFilter, setCount, addPickedTrack, setPlaylist } = useLineup();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyArtist[]>([]);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pickingFor, setPickingFor] = useState<string | null>(null);
  const [pickQuery, setPickQuery] = useState("");
  const [pickResults, setPickResults] = useState<PlaylistTrack[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
      if (res.status === 401) {
        setNeedsAuth(true);
        setResults([]);
      } else {
        const json = await res.json();
        setResults(json.artists || []);
        setNeedsAuth(false);
      }
      setLoading(false);
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  const runTrackSearch = useCallback(async (artistId: string, artistName: string, q: string) => {
    if (q.trim().length < 2) {
      setPickResults([]);
      return;
    }
    const res = await fetch(
      `/api/spotify/artist-tracks?artistId=${artistId}&artistName=${encodeURIComponent(artistName)}&pickQuery=${encodeURIComponent(q)}`
    );
    const json = await res.json();
    setPickResults((json.tracks || []).map((t: any) => ({ ...t, sourceArtistId: artistId, handpicked: true })));
  }, []);

  async function handlePreview() {
    if (lineup.length === 0) return;
    setGenerating(true);
    const allTracks: PlaylistTrack[] = [];
    for (const entry of lineup) {
      const params = new URLSearchParams({
        artistId: entry.artist.id,
        artistName: entry.artist.name,
        filter: entry.filter,
        count: String(entry.count),
      });
      const res = await fetch(`/api/spotify/artist-tracks?${params.toString()}`);
      const includedIds = new Set<string>();
      if (res.ok) {
        const json = await res.json();
        for (const t of json.tracks || []) {
          includedIds.add(t.id);
          allTracks.push({ ...t, sourceArtistId: entry.artist.id, handpicked: entry.pickedTrackIds.includes(t.id) });
        }
      }
      const missingPicks = entry.pickedTrackIds.filter((id) => !includedIds.has(id));
      if (missingPicks.length > 0) {
        const pickedRes = await fetch(`/api/spotify/artist-tracks?trackIds=${missingPicks.join(",")}`);
        if (pickedRes.ok) {
          const pickedJson = await pickedRes.json();
          for (const t of pickedJson.tracks || []) {
            allTracks.push({ ...t, sourceArtistId: entry.artist.id, handpicked: true });
          }
        }
      }
    }
    setPlaylist(allTracks);
    setGenerating(false);
    router.push("/lineup/preview");
  }

  return (
    <main className="min-h-screen pb-32">
      <div className="bg-grad text-white px-6 pt-10 pb-6">
        <h1 className="font-display text-2xl font-bold mb-4">Build your lineup</h1>
        <div className="bg-white/95 rounded-2xl px-4 py-3 flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#9CA39F" strokeWidth="2.2" />
            <path d="M21 21l-4.3-4.3" stroke="#9CA39F" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artists on Spotify"
            className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-faint"
          />
        </div>
      </div>

      <div className="px-6 py-4 max-w-lg mx-auto">
        {needsAuth && (
          <div className="bg-surface border border-line rounded-2xl p-4 mb-4 text-center">
            <p className="text-sm text-muted mb-3">Connect Spotify to search for artists.</p>
            <a href="/api/auth/login" className="inline-block bg-grad text-white text-xs font-bold px-5 py-2.5 rounded-xl">
              Connect Spotify
            </a>
          </div>
        )}

        {loading && <p className="text-xs text-faint mb-2">Searching...</p>}

        {results.map((artist) => (
          <div key={artist.id} className="flex items-center gap-3 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal/30 to-green/30 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{artist.name}</div>
              <div className="text-xs text-faint truncate">{artist.genres[0] || "Artist"}</div>
            </div>
            <button
              onClick={() => addArtist(artist)}
              className="w-7 h-7 rounded-full bg-grad text-white text-sm font-bold flex items-center justify-center flex-shrink-0"
            >
              +
            </button>
          </div>
        ))}

        <div className="flex items-center gap-2 my-5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-faint">
            Your lineup · {lineup.length}
          </span>
          <div className="flex-1 h-px bg-lineStrong" />
        </div>

        {lineup.length === 0 && (
          <p className="text-sm text-faint text-center py-6">Search for an artist above to get started.</p>
        )}

        {lineup.map((entry) => (
          <div key={entry.artist.id} className="bg-surface border border-line rounded-2xl p-4 mb-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal/30 to-green/30 flex-shrink-0" />
              <div className="flex-1 text-sm font-bold">{entry.artist.name}</div>
              <button
                onClick={() => removeArtist(entry.artist.id)}
                className="w-5.5 h-5.5 rounded-full bg-surfaceAlt text-faint text-xs font-bold w-6 h-6 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <FilterChips value={entry.filter} onChange={(f) => setFilter(entry.artist.id, f)} />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-faint font-semibold">Songs to add</span>
              <Stepper value={entry.count} onChange={(v) => setCount(entry.artist.id, v)} />
            </div>
            <button
              onClick={() => {
                setPickingFor(entry.artist.id);
                setPickQuery("");
                setPickResults([]);
              }}
              className="flex items-center gap-2 text-xs font-bold text-teal pt-2 border-t border-line w-full"
            >
              <span className="w-5 h-5 rounded-full border border-dashed border-teal flex items-center justify-center">+</span>
              Add specific songs
              {entry.pickedTrackIds.length > 0 && (
                <span className="ml-auto bg-teal/10 text-teal text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                  {entry.pickedTrackIds.length} picked
                </span>
              )}
            </button>

            {pickingFor === entry.artist.id && (
              <div className="mt-3 pt-3 border-t border-line">
                <input
                  autoFocus
                  value={pickQuery}
                  onChange={(e) => {
                    setPickQuery(e.target.value);
                    runTrackSearch(entry.artist.id, entry.artist.name, e.target.value);
                  }}
                  placeholder="Search a song title"
                  className="w-full bg-surfaceAlt border border-line rounded-xl px-3 py-2 text-sm mb-2 outline-none"
                />
                {pickResults.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-1.5">
                    <span className="text-xs truncate">{t.name}</span>
                    <button
                      onClick={() => addPickedTrack(entry.artist.id, t.id)}
                      className="text-[11px] font-bold text-teal flex-shrink-0 ml-2"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-surfaceAlt border-t border-line px-6 py-4">
        <div className="max-w-lg mx-auto">
          <GradientButton onClick={handlePreview} disabled={lineup.length === 0 || generating}>
            {generating ? "Generating..." : "Preview playlist"}
          </GradientButton>
        </div>
      </div>
    </main>
  );
}
