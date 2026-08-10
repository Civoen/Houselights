"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLineup } from "@/lib/lineupStore";
import { Stepper } from "@/components/Stepper";
import { FilterChips } from "@/components/FilterChips";
import { SegmentedControl } from "@/components/SegmentedControl";
import { GradientButton } from "@/components/GradientButton";
import { EqSpinner } from "@/components/EqSpinner";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { UndoToast } from "@/components/UndoToast";
import { haptic, HAPTIC } from "@/lib/haptics";
import { useReorder } from "@/lib/useReorder";
import { useRotatingText } from "@/lib/useRotatingText";
import { useUndoToast } from "@/lib/useUndoToast";
import { resizeImageToBase64 } from "@/lib/resizeImage";
import { SettingsButton } from "@/components/SettingsButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SpotifyArtist, PlaylistTrack, SpotifyTrack, LineupArtist, PlaylistSizeMode } from "@/lib/types";
import { copy } from "@/lib/copy";
import { fmtMinutes } from "@/lib/format";

interface PosterMatch {
  name: string;
  match: SpotifyArtist | null;
  selected: boolean;
}

interface PendingIssue {
  entry: LineupArtist;
  message: string;
  target: number;
}

const BAR_COLORS = ["#14CC9B", "#4FA8E8", "#F5A623", "#EF6461", "#6C63FF", "#2FB8C6", "#E14D9F", "#8BC34A"];
const GENERATING_PHRASES = copy.lineup.generatingPhrases;
const AVG_TRACK_MINUTES = 3.5;

const TIME_PRESETS = [
  { v: 30, l: copy.lineup.timePreset30 },
  { v: 60, l: copy.lineup.timePreset60 },
  { v: 90, l: copy.lineup.timePreset90 },
  { v: 120, l: copy.lineup.timePreset120 },
  { v: 180, l: copy.lineup.timePreset180 },
  { v: 300, l: copy.lineup.timePreset300 },
];

function computeTotalTargetSongs(mode: PlaylistSizeMode, value: number): number {
  if (mode === "songs") return Math.max(1, Math.round(value));
  return Math.max(1, Math.round(value / AVG_TRACK_MINUTES));
}

// Largest-remainder rounding: gives each artist a whole-number target
// proportional to their weight, while the targets still sum to exactly
// `totalTarget` (rather than everyone's individual Math.round() drifting
// the sum away from the actual goal).
function computeArtistTargets(lineup: LineupArtist[], totalTarget: number): { entry: LineupArtist; target: number }[] {
  const totalWeight = lineup.reduce((s, e) => s + e.weight, 0) || 1;
  const raw = lineup.map((e) => (e.weight / totalWeight) * totalTarget);
  const floors = raw.map((v) => Math.floor(v));
  const distributed = floors.reduce((s, v) => s + v, 0);
  let remainder = totalTarget - distributed;
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const targets = [...floors];
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) {
    targets[order[k].i] += 1;
  }
  return lineup.map((e, i) => ({ entry: e, target: Math.max(1, targets[i]) }));
}

export default function LineupPage() {
  const router = useRouter();
  const {
    lineup,
    playlistSizeMode,
    playlistSizeValue,
    setPlaylistSize,
    addArtist,
    removeArtist,
    restoreArtist,
    reorderArtist,
    toggleFilter,
    setWeight,
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
  const [pendingTracks, setPendingTracks] = useState<PlaylistTrack[] | null>(null);
  const [pendingIssues, setPendingIssues] = useState<PendingIssue[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);
  const [posterReview, setPosterReview] = useState<PosterMatch[] | null>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  const { dragIndex, overIndex, dragOffsetY, setItemRef, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel } =
    useReorder(lineup.length, (from, to) => {
      reorderArtist(from, to);
      haptic(HAPTIC.reorder);
    });

  const generatingText = useRotatingText(generating, GENERATING_PHRASES, 1300);
  const { toast: removeToast, show: showRemoveToast, dismiss: dismissRemoveToast } = useUndoToast<{
    entry: LineupArtist;
    index: number;
  }>();

  function handleRemoveArtist(entry: LineupArtist, index: number) {
    haptic(HAPTIC.remove);
    removeArtist(entry.artist.id);
    showRemoveToast(`Removed ${entry.artist.name}`, { entry, index });
  }

  function undoRemoveArtist() {
    if (!removeToast) return;
    restoreArtist(removeToast.payload.entry, removeToast.payload.index);
    dismissRemoveToast();
    haptic(HAPTIC.add);
  }

  useEffect(() => {
    setPendingTracks(null);
    setPendingIssues([]);
    setPreviewError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineup]);

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

  async function fetchArtistTracks(
    entry: LineupArtist,
    targetCount: number
  ): Promise<{ tracks: PlaylistTrack[]; error?: string; authExpired?: boolean }> {
    const includedIds = new Set<string>();
    const tracks: PlaylistTrack[] = [];
    let error: string | undefined;

    if (!entry.artist.id) {
      error = "This artist is missing its Spotify ID — try removing and re-adding them.";
    } else {
      const params = new URLSearchParams({
        artistId: entry.artist.id,
        artistName: entry.artist.name,
        filters: entry.filters.join(","),
        count: String(targetCount),
      });
      const res = await fetch(`/api/spotify/artist-tracks?${params.toString()}`);

      if (res.status === 401) return { tracks: [], authExpired: true };

      if (res.ok) {
        const json = await res.json();
        if (json.error) error = json.error;
        for (const t of json.tracks || []) {
          includedIds.add(t.id);
          tracks.push({ ...t, sourceArtistId: entry.artist.id, handpicked: entry.pickedTracks.some((p) => p.id === t.id) });
        }
      } else {
        let detail = `HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson?.error) detail = errJson.error;
        } catch {
          /* body wasn't JSON, fall back to status code */
        }
        error = detail;
      }
    }

    for (const t of entry.pickedTracks) {
      if (includedIds.has(t.id)) continue;
      includedIds.add(t.id);
      tracks.push({ ...t, sourceArtistId: entry.artist.id, handpicked: true });
    }

    return { tracks, error };
  }

  async function handlePreview() {
    if (lineup.length === 0) return;

    // second tap after seeing a partial-failure warning — proceed with what we already have
    if (pendingTracks) {
      setPlaylist(pendingTracks);
      setPendingTracks(null);
      setPendingIssues([]);
      setPreviewError(null);
      router.push("/lineup/preview");
      return;
    }

    setGenerating(true);
    setPreviewError(null);

    const totalTarget = computeTotalTargetSongs(playlistSizeMode, playlistSizeValue);
    const targets = computeArtistTargets(lineup, totalTarget);

    const outcomes: { entry: LineupArtist; tracks: PlaylistTrack[]; requested: number; error?: string }[] = [];
    for (const { entry, target } of targets) {
      const result = await fetchArtistTracks(entry, target);
      if (result.authExpired) {
        setNeedsAuth(true);
        setGenerating(false);
        setPreviewError("Your Spotify connection expired. Reconnect above and try again.");
        return;
      }
      outcomes.push({ entry, tracks: result.tracks, requested: target, error: result.error });
    }

    // redistribution pass — if the lineup as a whole came up short of the
    // goal, ask whichever artists already met their own target for a bit
    // more (they're the ones who plausibly have room to give), splitting
    // the remaining gap across them. This is what makes the weight system
    // a genuine goal rather than a hard per-artist cap.
    let allTracks: PlaylistTrack[] = outcomes.flatMap((o) => o.tracks);
    let shortfall = totalTarget - allTracks.length;
    if (shortfall > 0) {
      const candidates = outcomes.filter((o) => o.tracks.length >= o.requested && !o.error);
      if (candidates.length > 0) {
        const share = Math.ceil(shortfall / candidates.length);
        for (const cand of candidates) {
          if (shortfall <= 0) break;
          const bumped = await fetchArtistTracks(cand.entry, cand.requested + share);
          if (bumped.authExpired) {
            setNeedsAuth(true);
            setGenerating(false);
            setPreviewError("Your Spotify connection expired. Reconnect above and try again.");
            return;
          }
          const existingIds = new Set(allTracks.map((t) => t.id));
          const fresh = bumped.tracks.filter((t) => !existingIds.has(t.id));
          const toAdd = fresh.slice(0, shortfall);
          allTracks = [...allTracks, ...toAdd];
          shortfall -= toAdd.length;
        }
      }
    }

    setGenerating(false);

    const failed: PendingIssue[] = outcomes
      .filter((o) => o.error)
      .map((o) => ({ entry: o.entry, message: o.error!, target: o.requested }));

    if (allTracks.length === 0) {
      setPreviewError(
        failed.length > 0
          ? failed.map((f) => `${f.entry.artist.name}: ${f.message}`).join(" ")
          : "Your lineup didn't return any tracks. Try a different filter or check the artist names."
      );
      return;
    }

    if (failed.length > 0) {
      setPendingTracks(allTracks);
      setPendingIssues(failed);
      return;
    }

    setPlaylist(allTracks);
    router.push("/lineup/preview");
  }

  async function retryArtist(issue: PendingIssue) {
    setRetryingId(issue.entry.artist.id);
    haptic(HAPTIC.tap);
    const result = await fetchArtistTracks(issue.entry, issue.target);
    setRetryingId(null);

    if (result.authExpired) {
      setNeedsAuth(true);
      setPreviewError("Your Spotify connection expired. Reconnect above and try again.");
      return;
    }

    setPendingTracks((prev) => {
      const withoutOld = (prev || []).filter((t) => t.sourceArtistId !== issue.entry.artist.id);
      return [...withoutOld, ...result.tracks];
    });

    if (result.error) {
      setPendingIssues((prev) => prev.map((p) => (p.entry.artist.id === issue.entry.artist.id ? { ...p, message: result.error! } : p)));
    } else {
      setPendingIssues((prev) => prev.filter((p) => p.entry.artist.id !== issue.entry.artist.id));
      haptic(HAPTIC.add);
    }
  }

  const totalWeight = lineup.reduce((s, e) => s + e.weight, 0) || 1;
  const totalTargetSongs = computeTotalTargetSongs(playlistSizeMode, playlistSizeValue);
  const totalTargetMinutes = playlistSizeMode === "time" ? playlistSizeValue : Math.round(totalTargetSongs * AVG_TRACK_MINUTES);

  return (
    <main className="min-h-screen pb-48 animate-fade-slide-up">
      <div className="px-6 pb-2 pt-[calc(env(safe-area-inset-top)+1.5rem)] max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display text-3xl font-bold tracking-tight">{copy.lineup.title}</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle className="w-9 h-9 rounded-full bg-surfaceAlt text-muted" />
            <SettingsButton className="w-9 h-9 rounded-full bg-surfaceAlt text-muted" />
          </div>
        </div>
        <div className="bg-surface rounded-2xl px-4 py-3 flex items-center gap-3 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.22)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#93A0AB" strokeWidth="2.2" />
            <path d="M21 21l-4.3-4.3" stroke="#93A0AB" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy.lineup.searchPlaceholder}
            className="flex-1 bg-transparent outline-none text-[16px] text-ink placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="px-6 py-4 max-w-lg mx-auto">
        <div className="bg-surface rounded-2xl p-4 mb-4 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.22)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted">{copy.lineup.playlistSizeLabel}</span>
          </div>
          <SegmentedControl
            className="mb-3"
            value={playlistSizeMode}
            onChange={(id) => setPlaylistSize(id as "songs" | "time", id === "songs" ? (playlistSizeMode === "songs" ? playlistSizeValue : 40) : (playlistSizeMode === "time" ? playlistSizeValue : 60))}
            options={[
              { id: "songs", label: copy.lineup.sizeModeSongs },
              { id: "time", label: copy.lineup.sizeModeTime },
            ]}
          />
          {playlistSizeMode === "songs" ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-faint block">{copy.lineup.totalSongsLabel}</span>
                <span className="text-[11px] text-faint">≈ {fmtMinutes(totalTargetMinutes)}</span>
              </div>
              <Stepper value={playlistSizeValue} onChange={(v) => setPlaylistSize("songs", v)} min={5} max={300} step={5} />
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                {TIME_PRESETS.map((preset) => (
                  <button
                    key={preset.v}
                    onClick={() => setPlaylistSize("time", preset.v)}
                    className={
                      "px-3 py-1.5 rounded-full text-[11px] font-bold transition-all " +
                      (playlistSizeValue === preset.v
                        ? "bg-grad text-white shadow-[0_6px_16px_-6px_rgba(17,80,103,0.55)]"
                        : "bg-surfaceAlt text-muted")
                    }
                  >
                    {preset.l}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-faint">≈ {totalTargetSongs} songs</span>
            </div>
          )}
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
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-accent text-accent text-xs font-bold mb-4 transition-all duration-150 active:scale-[0.98] disabled:opacity-60"
        >
          {posterLoading ? (
            <>
              <EqSpinner />
              {copy.lineup.posterUploadLoading}
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="9" cy="10" r="1.6" fill="currentColor" />
                <path d="M4 17l5-5 4 4 3-3 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {copy.lineup.posterUploadIdle}
            </>
          )}
        </button>
        {posterError && (
          <p className="text-xs text-red-600 mb-4 -mt-2 animate-fade-slide-up">{posterError}</p>
        )}

        {posterReview && (
          <div className="bg-surface rounded-2xl p-4 mb-4 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] animate-pop-in">
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-faint mb-3">
              {copy.lineup.posterFoundHeading}
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
                  {!item.match && <div className="text-[10px] text-faint">{copy.lineup.posterNoMatch}</div>}
                </div>
              </button>
            ))}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setPosterReview(null)}
                className="flex-1 py-2.5 rounded-xl bg-surfaceAlt text-muted text-xs font-bold transition-all active:scale-95"
              >
                {copy.lineup.posterCancel}
              </button>
              <GradientButton
                onClick={confirmPosterAdd}
                disabled={!posterReview.some((p) => p.selected)}
                className="flex-1 py-2.5 text-xs"
              >
                {copy.lineup.posterAddOne} {posterReview.filter((p) => p.selected).length} artist
                {posterReview.filter((p) => p.selected).length === 1 ? "" : "s"}
              </GradientButton>
            </div>
          </div>
        )}

        {needsAuth && (
          <div className="bg-surface rounded-2xl p-4 mb-4 text-center shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] animate-pop-in">
            <p className="text-sm text-muted mb-3">{copy.lineup.connectPrompt}</p>
            <a
              href="/api/auth/login"
              className="inline-block bg-grad text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all duration-150 hover:brightness-[1.05] active:scale-[0.96]"
            >
              {copy.lineup.connectButton}
            </a>
          </div>
        )}

        {loading && <p className="text-xs text-faint mb-2">{copy.lineup.searching}</p>}

        {results.map((artist, i) => (
          <div
            key={artist.id}
            className="flex items-center gap-3 py-2 animate-fade-slide-up"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <ArtistAvatar src={artist.image} size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{artist.name}</div>
              <div className="text-xs text-faint truncate">{artist.genres[0] || copy.lineup.artistFallbackGenre}</div>
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
            {copy.lineup.lineupLabel} · {lineup.length}
          </span>
          <div className="flex-1 h-px bg-lineStrong" />
        </div>

        {lineup.length > 0 && (
          <div className="mb-3">
            <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-surfaceAlt">
              {lineup.map((entry, i) => {
                const pct = (entry.weight / totalWeight) * 100;
                return (
                  <div
                    key={entry.artist.id}
                    style={{ width: `${pct}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                    className="h-full transition-all duration-300"
                  />
                );
              })}
            </div>
            <p className="text-[11px] text-faint mt-1.5">
              ≈ {totalTargetSongs} tracks · ~{fmtMinutes(totalTargetMinutes)} {copy.lineup.estimateSuffix}
            </p>
          </div>
        )}

        {lineup.length > 1 && (
          <p className="text-[11px] text-faint mb-3">{copy.lineup.dragHint}</p>
        )}

        {lineup.length === 0 && (
          <p className="text-sm text-faint text-center py-6">{copy.lineup.emptyLineup}</p>
        )}

        {lineup.map((entry, i) => {
          const artistColor = BAR_COLORS[i % BAR_COLORS.length];
          const isDropTarget = overIndex === i && dragIndex !== null;
          const sharePct = Math.round((entry.weight / totalWeight) * 100);
          return (
          <div
            key={entry.artist.id}
            ref={setItemRef(i)}
            className={
              "bg-surface border rounded-2xl p-4 mb-3 shadow-[0_10px_24px_-16px_rgba(10,31,38,0.3)] " +
              (dragIndex === i
                ? "shadow-2xl z-20 relative"
                : "transition-all duration-150 " +
                  (isDropTarget ? "border-accent" : "animate-pop-in"))
            }
            style={{
              ...(dragIndex === i
                ? { transform: `translateY(${dragOffsetY}px) scale(1.03)`, transition: "box-shadow 0.15s ease" }
                : {}),
              ...(isDropTarget ? {} : { borderColor: artistColor }),
            }}
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
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                aria-hidden="true"
              />
              <ArtistAvatar src={entry.artist.image} size={36} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{entry.artist.name}</div>
                {i === 0 && lineup.length > 1 && (
                  <div className="text-[10px] font-extrabold uppercase tracking-wide text-accent">{copy.lineup.headlinerTag}</div>
                )}
              </div>
              <button
                onClick={() => handleRemoveArtist(entry, i)}
                className="w-6 h-6 rounded-full bg-surfaceAlt text-faint text-xs font-bold flex items-center justify-center transition-all duration-150 hover:bg-red-50 hover:text-red-500 active:scale-90"
              >
                ✕
              </button>
            </div>
            <FilterChips value={entry.filters} onToggle={(f) => toggleFilter(entry.artist.id, f)} />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-faint font-semibold">
                {copy.lineup.weightLabel} · {sharePct}% {copy.lineup.weightGoalSuffix}
              </span>
              <Stepper value={entry.weight} onChange={(v) => setWeight(entry.artist.id, v)} min={1} max={10} />
            </div>
            <button
              onClick={() => {
                setPickingFor(pickingFor === entry.artist.id ? null : entry.artist.id);
                setPickQuery("");
                setPickResults([]);
              }}
              className="flex items-center gap-2 text-xs font-bold text-accent pt-2 border-t border-line w-full transition-opacity duration-150 active:opacity-60"
            >
              <span className="w-5 h-5 rounded-full border border-dashed border-accent flex items-center justify-center transition-transform duration-200">
                {pickingFor === entry.artist.id ? "−" : "+"}
              </span>
              {copy.lineup.addSpecificSongs}
              {entry.pickedTracks.length > 0 && (
                <span className="ml-auto bg-accent/10 text-accent text-[10px] font-extrabold px-2 py-0.5 rounded-md animate-pop-in">
                  {entry.pickedTracks.length} picked
                </span>
              )}
            </button>

            {pickingFor === entry.artist.id && (
              <div className="mt-3 pt-3 border-t border-line animate-fade-slide-up">
                {entry.pickedTracks.length > 0 && (
                  <div className="mb-3 pb-3 border-b border-line">
                    <div className="text-[11px] font-extrabold uppercase tracking-wide text-faint mb-2">
                      {copy.lineup.pickedSongsLabel}
                    </div>
                    {entry.pickedTracks.map((t) => (
                      <div key={t.id} className="flex items-center justify-between py-1">
                        <span className="text-xs truncate">{t.name}</span>
                        <button
                          onClick={() => { haptic(HAPTIC.remove); removePickedTrack(entry.artist.id, t.id); }}
                          className="text-[11px] text-faint flex-shrink-0 ml-2 transition-colors active:text-red-500"
                        >
                          {copy.lineup.remove}
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
                  placeholder={copy.lineup.searchSongPlaceholder}
                  className="w-full bg-surfaceAlt border border-line rounded-xl px-3 py-2 text-sm mb-2 outline-none transition-shadow focus:ring-2 focus:ring-accent/30"
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
                      className="text-[11px] font-bold text-accent flex-shrink-0 ml-2 transition-transform duration-150 active:scale-90"
                    >
                      {copy.lineup.add}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );})}
      </div>

      {removeToast && <UndoToast message={removeToast.message} onUndo={undoRemoveArtist} className="bottom-36" />}

      <div className="fixed left-6 right-6 bottom-[calc(4rem+16px+env(safe-area-inset-bottom))] z-20 max-w-lg mx-auto">
        {pendingIssues.length > 0 && (
          <div className="bg-surface rounded-2xl p-3 mb-3 shadow-[0_16px_36px_-16px_rgba(10,31,38,0.35)] animate-fade-slide-up">
            {pendingIssues.map((issue) => (
              <div key={issue.entry.artist.id} className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-xs text-red-600 flex-1 min-w-0 truncate">
                  <span className="font-bold">{issue.entry.artist.name}:</span> {issue.message}
                </span>
                <button
                  onClick={() => retryArtist(issue)}
                  disabled={retryingId === issue.entry.artist.id}
                  className="text-[11px] font-bold text-accent flex-shrink-0 transition-transform duration-150 active:scale-90 disabled:opacity-50"
                >
                  {retryingId === issue.entry.artist.id ? copy.lineup.retrying : copy.lineup.retry}
                </button>
              </div>
            ))}
          </div>
        )}
        {previewError && pendingIssues.length === 0 && (
          <p className="text-xs text-red-600 mb-2 bg-surface rounded-xl px-3 py-2 shadow-[0_10px_24px_-14px_rgba(10,31,38,0.3)] animate-fade-slide-up">
            {previewError}
          </p>
        )}
        <GradientButton
          onClick={handlePreview}
          disabled={lineup.length === 0 || generating}
          className="shadow-[0_16px_36px_-12px_rgba(17,80,103,0.55)]"
        >
          {generating ? (
            <>
              <EqSpinner />
              {generatingText}
            </>
          ) : pendingTracks ? (
            copy.lineup.ctaContinueAnyway
          ) : (
            copy.lineup.ctaPreview
          )}
        </GradientButton>
      </div>
    </main>
  );
}
