"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLineup } from "@/lib/lineupStore";
import { Stepper } from "@/components/Stepper";
import { FilterChips } from "@/components/FilterChips";
import { GradientButton } from "@/components/GradientButton";
import { Spinner } from "@/components/Spinner";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { haptic, HAPTIC } from "@/lib/haptics";
import { useReorder } from "@/lib/useReorder";
import { resizeImageToBase64 } from "@/lib/resizeImage";
import { SpotifyArtist, PlaylistTrack, SpotifyTrack } from "@/lib/types";

interface PosterMatch {
  name: string;
  match: SpotifyArtist | null;
  selected: boolean;
}

export default function LineupPage() {
  const router = useRouter();
  const {
    lineup,
    eventDate,
    setEventDate,
    addArtist,
    removeArtist,
    reorderArtist,
    toggleFilter,
    setCount,
    addPickedTrack,
    removePickedTrack,
    setPlaylist,
  } = useLineup();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyArtist[]>([]);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pickingFor, setPickingFor] = useState<string | null>(null);
  const [pickQuery, setPickQuery] = useState("");
  const [pickResults, setPickResults] = useState<SpotifyTrack[]>([]);
  const [generating, setGenerating] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);
  const [posterReview, setPosterReview] = useState<PosterMatch[] | null>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  const { dragIndex, overIndex, setItemRef, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel } =
    useReorder(lineup.length, (from, to) => {
      reorderArtist(from, to);
      haptic(HAPTIC.reorder);
    });

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
    setPickResults(json.tracks || []);
  }, []);

  async function handlePosterUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPosterLoading(true);
    setPosterError(null);
    setPosterReview(null);
    try {
      const imageBase64 = await resizeImageToBase64(file);
      const res = await fetch("/api/poster/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mediaType: "image/jpeg" }),
      });
      const json = await res.json();
      if (res.status === 501) {
        setPosterError("Poster reading isn't set up yet — add an ANTHROPIC_API_KEY to enable it.");
        return;
      }
      if (!res.ok) {
        setPosterError(json.error || "Couldn't read that poster.");
        return;
      }
      const names: string[] = json.names || [];
      if (names.length === 0) {
        setPosterError("Couldn't find any artist names on that image. Try a clearer photo.");
        return;
      }
      const matched = await Promise.all(
        names.map(async (name): Promise<PosterMatch> => {
          try {
            const r = await fetch(`/api/spotify/search?q=${encodeURIComponent(name)}`);
            if (!r.ok) return { name, match: null, selected: false };
            const j = await r.json();
            const match: SpotifyArtist | null = (j.artists && j.artists[0]) || null;
            return { name, match, selected: !!match };
          } catch {
            return { name, match: null, selected: false };
          }
        })
      );
      setPosterReview(matched);
      haptic(HAPTIC.tap);
    } catch (err: any) {
      setPosterError(err.message || "Couldn't read that image.");
    } finally {
      setPosterLoading(false);
      if (posterInputRef.current) posterInputRef.current.value = "";
    }
  }

  function togglePosterSelection(i: number) {
    setPosterReview((prev) => (prev ? prev.map((item, idx) => (idx === i ? { ...item, selected: !item.selected } : item)) : prev));
  }

  function confirmPosterAdd() {
    if (!posterReview) return;
    posterReview.filter((p) => p.selected && p.match).forEach((p) => addArtist(p.match!));
    haptic(HAPTIC.add);
    setPosterReview(null);
  }

  async function handlePreview() {
    if (lineup.length === 0) return;
    setGenerating(true);
    setPreviewError(null);
    const allTracks: PlaylistTrack[] = [];
    const issues: string[] = [];
    for (const entry of lineup) {
      const params = new URLSearchParams({
        artistId: entry.artist.id,
        artistName: entry.artist.name,
        filters: entry.filters.join(","),
        count: String(entry.count),
      });
      const res = await fetch(`/api/spotify/artist-tracks?${params.toString()}`);
      const includedIds = new Set<string>();
      if (res.status === 401) {
        setNeedsAuth(true);
        setGenerating(false);
        setPreviewError("Your Spotify connection expired. Reconnect above and try again.");
        return;
      }
      if (res.ok) {
        const json = await res.json();
        if (json.error) {
          issues.push(`${entry.artist.name}: ${json.error}`);
        }
        for (const t of json.tracks || []) {
          includedIds.add(t.id);
          allTracks.push({ ...t, sourceArtistId: entry.artist.id, handpicked: entry.pickedTracks.some((p) => p.id === t.id) });
        }
      } else {
        let detail = `HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson?.error) detail = errJson.error;
        } catch {
          /* body wasn't JSON, fall back to status code */
        }
        issues.push(`${entry.artist.name}: ${detail}`);
      }
      // hand-picked tracks already have full data, no need to re-fetch them
      for (const t of entry.pickedTracks) {
        if (includedIds.has(t.id)) continue;
        includedIds.add(t.id);
        allTracks.push({ ...t, sourceArtistId: entry.artist.id, handpicked: true });
      }
    }
    setGenerating(false);
    if (allTracks.length === 0) {
      setPreviewError(
        issues.length > 0
          ? issues.join(" ")
          : "Your lineup didn't return any tracks. Try a different filter or check the artist names."
      );
      return;
    }
    setPlaylist(allTracks);
    router.push("/lineup/preview");
  }

  return (
    <main className="min-h-screen pb-48 animate-fade-slide-up">
      <div className="bg-grad text-white px-6 pt-10 pb-6">
        <h1 className="font-display text-2xl font-bold mb-4">Build your lineup</h1>
        <div className="bg-white/95 rounded-2xl px-4 py-3 flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#93A0AB" strokeWidth="2.2" />
            <path d="M21 21l-4.3-4.3" stroke="#93A0AB" strokeWidth="2.2" strokeLinecap="round" />
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
        <div className="flex items-center justify-between gap-3 bg-surface border border-line rounded-2xl px-4 py-3 mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Event date
            <span className="text-faint font-normal">(optional)</span>
          </div>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="bg-transparent text-xs font-semibold text-ink outline-none"
          />
        </div>

        <input
          ref={posterInputRef}
          type="file"
          accept="image/*"
          onChange={handlePosterUpload}
          className="hidden"
        />
        <button
          onClick={() => posterInputRef.current?.click()}
          disabled={posterLoading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-teal text-teal text-xs font-bold mb-4 transition-all duration-150 active:scale-[0.98] disabled:opacity-60"
        >
          {posterLoading ? (
            <>
              <Spinner />
              Reading poster...
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="9" cy="10" r="1.6" fill="currentColor" />
                <path d="M4 17l5-5 4 4 3-3 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Upload a poster to auto-add artists
            </>
          )}
        </button>
        {posterError && (
          <p className="text-xs text-red-600 mb-4 -mt-2 animate-fade-slide-up">{posterError}</p>
        )}

        {posterReview && (
          <div className="bg-surface border border-line rounded-2xl p-4 mb-4 animate-pop-in">
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-faint mb-3">
              Found on your poster
            </div>
            {posterReview.map((item, i) => (
              <button
                key={i}
                onClick={() => item.match && togglePosterSelection(i)}
                disabled={!item.match}
                className={"w-full flex items-center gap-3 py-2 text-left " + (!item.match ? "opacity-40" : "")}
              >
                <div
                  className={
                    "w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors " +
                    (item.selected ? "bg-grad border-transparent" : "border-lineStrong")
                  }
                >
                  {item.selected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <ArtistAvatar src={item.match?.image} size={30} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{item.match?.name || item.name}</div>
                  {!item.match && <div className="text-[10px] text-faint">No Spotify match found</div>}
                </div>
              </button>
            ))}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setPosterReview(null)}
                className="flex-1 py-2.5 rounded-xl border border-lineStrong text-muted text-xs font-bold transition-all active:scale-95"
              >
                Cancel
              </button>
              <GradientButton
                onClick={confirmPosterAdd}
                disabled={!posterReview.some((p) => p.selected)}
                className="flex-1 py-2.5 text-xs"
              >
                Add {posterReview.filter((p) => p.selected).length} artist
                {posterReview.filter((p) => p.selected).length === 1 ? "" : "s"}
              </GradientButton>
            </div>
          </div>
        )}

        {needsAuth && (
          <div className="bg-surface border border-line rounded-2xl p-4 mb-4 text-center animate-pop-in">
            <p className="text-sm text-muted mb-3">Connect Spotify to search for artists.</p>
            <a
              href="/api/auth/login"
              className="inline-block bg-grad text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all duration-150 hover:brightness-[1.05] active:scale-[0.96]"
            >
              Connect Spotify
            </a>
          </div>
        )}

        {loading && <p className="text-xs text-faint mb-2">Searching...</p>}

        {results.map((artist, i) => (
          <div
            key={artist.id}
            className="flex items-center gap-3 py-2 animate-fade-slide-up"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <ArtistAvatar src={artist.image} size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{artist.name}</div>
              <div className="text-xs text-faint truncate">{artist.genres[0] || "Artist"}</div>
            </div>
            <button
              onClick={() => { haptic(HAPTIC.add); addArtist(artist); }}
              className="w-7 h-7 rounded-full bg-grad text-white text-sm font-bold flex items-center justify-center flex-shrink-0 transition-transform duration-150 hover:scale-110 active:scale-90"
            >
              +
            </button>
          </div>
        ))}

        <div className="flex items-center gap-2 mt-5 mb-1">
          <span className="text-xs font-extrabold uppercase tracking-wide text-faint">
            Your lineup · {lineup.length}
          </span>
          <div className="flex-1 h-px bg-lineStrong" />
        </div>
        {lineup.length > 1 && (
          <p className="text-[11px] text-faint mb-3">Drag to reorder — whoever's on top is the headliner.</p>
        )}

        {lineup.length === 0 && (
          <p className="text-sm text-faint text-center py-6">Search for an artist above to get started.</p>
        )}

        {lineup.map((entry, i) => (
          <div
            key={entry.artist.id}
            ref={setItemRef(i)}
            className={
              "bg-surface border border-line rounded-2xl p-4 mb-3 transition-all duration-150 " +
              (dragIndex === i
                ? "opacity-50 scale-[0.98] shadow-lg z-10 relative"
                : overIndex === i && dragIndex !== null
                ? "border-teal"
                : "opacity-100 scale-100 animate-pop-in")
            }
          >
            <div className="flex items-center gap-3 mb-3">
              <span
                onPointerDown={handlePointerDown(i)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                className="text-faint text-base select-none cursor-grab active:cursor-grabbing px-1 -mx-1"
                style={{ touchAction: "none" }}
              >
                ⠿
              </span>
              <ArtistAvatar src={entry.artist.image} size={36} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{entry.artist.name}</div>
                {i === 0 && lineup.length > 1 && (
                  <div className="text-[10px] font-extrabold uppercase tracking-wide text-teal">Headliner</div>
                )}
              </div>
              <button
                onClick={() => { haptic(HAPTIC.remove); removeArtist(entry.artist.id); }}
                className="w-6 h-6 rounded-full bg-surfaceAlt text-faint text-xs font-bold flex items-center justify-center transition-all duration-150 hover:bg-red-50 hover:text-red-500 active:scale-90"
              >
                ✕
              </button>
            </div>
            <FilterChips value={entry.filters} onToggle={(f) => toggleFilter(entry.artist.id, f)} />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-faint font-semibold">Songs to add</span>
              <Stepper value={entry.count} onChange={(v) => setCount(entry.artist.id, v)} />
            </div>
            <button
              onClick={() => {
                setPickingFor(pickingFor === entry.artist.id ? null : entry.artist.id);
                setPickQuery("");
                setPickResults([]);
              }}
              className="flex items-center gap-2 text-xs font-bold text-teal pt-2 border-t border-line w-full transition-opacity duration-150 active:opacity-60"
            >
              <span className="w-5 h-5 rounded-full border border-dashed border-teal flex items-center justify-center transition-transform duration-200">
                {pickingFor === entry.artist.id ? "−" : "+"}
              </span>
              Add specific songs
              {entry.pickedTracks.length > 0 && (
                <span className="ml-auto bg-teal/10 text-teal text-[10px] font-extrabold px-2 py-0.5 rounded-md animate-pop-in">
                  {entry.pickedTracks.length} picked
                </span>
              )}
            </button>

            {pickingFor === entry.artist.id && (
              <div className="mt-3 pt-3 border-t border-line animate-fade-slide-up">
                {entry.pickedTracks.length > 0 && (
                  <div className="mb-3 pb-3 border-b border-line">
                    <div className="text-[11px] font-extrabold uppercase tracking-wide text-faint mb-2">
                      Picked songs
                    </div>
                    {entry.pickedTracks.map((t) => (
                      <div key={t.id} className="flex items-center justify-between py-1">
                        <span className="text-xs truncate">{t.name}</span>
                        <button
                          onClick={() => { haptic(HAPTIC.remove); removePickedTrack(entry.artist.id, t.id); }}
                          className="text-[11px] text-faint flex-shrink-0 ml-2 transition-colors active:text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  autoFocus
                  value={pickQuery}
                  onChange={(e) => {
                    setPickQuery(e.target.value);
                    runTrackSearch(entry.artist.id, entry.artist.name, e.target.value);
                  }}
                  placeholder="Search a song title"
                  className="w-full bg-surfaceAlt border border-line rounded-xl px-3 py-2 text-sm mb-2 outline-none transition-shadow focus:ring-2 focus:ring-teal/30"
                />
                {pickResults.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-1.5 animate-fade-slide-up"
                    style={{ animationDelay: `${i * 25}ms` }}
                  >
                    <span className="text-xs truncate">{t.name}</span>
                    <button
                      onClick={() => { haptic(HAPTIC.add); addPickedTrack(entry.artist.id, t); }}
                      className="text-[11px] font-bold text-teal flex-shrink-0 ml-2 transition-transform duration-150 active:scale-90"
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

      <div
        className="fixed bottom-16 left-0 right-0 z-20 bg-surfaceAlt/95 backdrop-blur border-t border-line px-6 pt-4 pb-4 shadow-[0_-8px_24px_-12px_rgba(20,22,20,0.18)]"
      >
        <div className="max-w-lg mx-auto">
          {previewError && (
            <p className="text-xs text-red-600 mb-2 animate-fade-slide-up">{previewError}</p>
          )}
          <GradientButton onClick={handlePreview} disabled={lineup.length === 0 || generating} glow={lineup.length > 0 && !generating}>
            {generating ? (
              <>
                <Spinner />
                Generating...
              </>
            ) : (
              "Preview playlist"
            )}
          </GradientButton>
        </div>
      </div>
    </main>
  );
}
