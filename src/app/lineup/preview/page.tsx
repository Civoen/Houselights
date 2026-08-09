"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLineup } from "@/lib/lineupStore";
import { GradientButton } from "@/components/GradientButton";
import { AlbumArt } from "@/components/AlbumArt";
import { UndoToast } from "@/components/UndoToast";
import { haptic, HAPTIC } from "@/lib/haptics";
import { useReorder } from "@/lib/useReorder";
import { useUndoToast } from "@/lib/useUndoToast";
import { PlaylistTrack } from "@/lib/types";

function fmtDuration(ms: number) {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function orderByArtist(tracks: PlaylistTrack[], artistOrder: string[], direction: "asc" | "desc"): PlaylistTrack[] {
  const indexMap = new Map(artistOrder.map((id, i) => [id, i]));
  const withIndex = tracks.map((t, i) => ({
    t,
    i,
    artistIndex: indexMap.get(t.sourceArtistId) ?? artistOrder.length,
  }));
  withIndex.sort((a, b) => {
    const diff = direction === "asc" ? a.artistIndex - b.artistIndex : b.artistIndex - a.artistIndex;
    if (diff !== 0) return diff;
    return a.i - b.i;
  });
  return withIndex.map((x) => x.t);
}

function shuffleTracks(tracks: PlaylistTrack[]): PlaylistTrack[] {
  const arr = [...tracks];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function PreviewPage() {
  const router = useRouter();
  const { lineup, playlist, removeTrack, restoreTrack, reorderTrack, addTrackToPlaylist, setPlaylist } = useLineup();
  const [addArtistQuery, setAddArtistQuery] = useState("");
  const [addArtistResults, setAddArtistResults] = useState<any[]>([]);
  const [chosenArtist, setChosenArtist] = useState<{ id: string; name: string } | null>(null);
  const [addTrackQuery, setAddTrackQuery] = useState("");
  const [addTrackResults, setAddTrackResults] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const { toast: removeToast, show: showRemoveToast, dismiss: dismissRemoveToast } = useUndoToast<{
    track: PlaylistTrack;
    index: number;
  }>();

  function handleRemoveTrack(track: PlaylistTrack, index: number) {
    haptic(HAPTIC.remove);
    removeTrack(index);
    showRemoveToast(`Removed ${track.name}`, { track, index });
  }

  function undoRemoveTrack() {
    if (!removeToast) return;
    restoreTrack(removeToast.payload.track, removeToast.payload.index);
    dismissRemoveToast();
    haptic(HAPTIC.add);
  }

  const { dragIndex, overIndex, dragOffsetY, setItemRef, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel } =
    useReorder(playlist.length, (from, to) => {
      reorderTrack(from, to);
      haptic(HAPTIC.reorder);
    });

  const totalMs = playlist.reduce((s, t) => s + t.durationMs, 0);
  const totalMin = Math.round(totalMs / 60000);
  const artistCount = new Set(playlist.map((t) => t.sourceArtistId)).size;
  const artistOrder = lineup.map((a) => a.artist.id);

  function applyOrder(mode: "hype" | "headliner" | "shuffle") {
    haptic(HAPTIC.reorder);
    if (mode === "shuffle") {
      setPlaylist(shuffleTracks(playlist));
    } else if (mode === "hype") {
      setPlaylist(orderByArtist(playlist, artistOrder, "desc"));
    } else {
      setPlaylist(orderByArtist(playlist, artistOrder, "asc"));
    }
  }

  async function searchArtist(q: string) {
    setAddArtistQuery(q);
    setChosenArtist(null);
    if (q.trim().length < 2) {
      setAddArtistResults([]);
      return;
    }
    const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const json = await res.json();
      setAddArtistResults(json.artists || []);
    }
  }

  async function searchTrack(q: string) {
    setAddTrackQuery(q);
    if (!chosenArtist || q.trim().length < 2) {
      setAddTrackResults([]);
      return;
    }
    const params = new URLSearchParams({
      artistId: chosenArtist.id,
      artistName: chosenArtist.name,
      pickQuery: q,
    });
    const res = await fetch(`/api/spotify/artist-tracks?${params.toString()}`);
    if (res.ok) {
      const json = await res.json();
      setAddTrackResults(json.tracks || []);
    }
  }

  return (
    <main className="min-h-screen pb-48 animate-fade-slide-up">
      <div className="bg-grad text-white px-6 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => router.back()}
            className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-150 active:scale-90 hover:bg-white/30"
          >
            ‹
          </button>
          <h1 className="font-display text-xl font-bold">Preview playlist</h1>
        </div>
        <p className="text-sm opacity-90 ml-10">
          {playlist.length} tracks · {totalMin} min · {artistCount} artists
        </p>
      </div>

      <div className="px-6 py-4 max-w-lg mx-auto">
        {playlist.length === 0 && (
          <p className="text-sm text-faint text-center py-10">
            Your lineup didn't return any tracks. Go back and adjust your filters or song counts.
          </p>
        )}

        {playlist.length > 0 && (
          <p className="text-[11px] text-faint mb-3">
            Tap <span className="text-accent">▶</span> next to a track to listen on Spotify before you commit to it.
          </p>
        )}

        {playlist.length > 0 && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => applyOrder("hype")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold bg-surfaceAlt text-muted border border-line transition-all duration-150 active:scale-95 hover:border-accent hover:text-accent"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              Hype
            </button>
            <button
              onClick={() => applyOrder("headliner")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold bg-surfaceAlt text-muted border border-line transition-all duration-150 active:scale-95 hover:border-accent hover:text-accent"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M12 3l2.6 5.6L21 9.3l-4.5 4.2 1.2 6.2L12 16.8l-5.7 2.9 1.2-6.2L3 9.3l6.4-.7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
              Headliner
            </button>
            <button
              onClick={() => applyOrder("shuffle")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold bg-surfaceAlt text-muted border border-line transition-all duration-150 active:scale-95 hover:border-accent hover:text-accent"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h4l9 12h5M3 18h4l3.5-4.5M16 6h5M16 6l3-3M16 6l3 3M21 18l-3 3M21 18l-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Shuffle
            </button>
          </div>
        )}

        {playlist.map((t, i) => (
          <div
            key={`${t.id}-${i}`}
            ref={setItemRef(i)}
            className={
              "flex items-center gap-3 py-2 border-b border-line rounded-xl px-2 -mx-2 " +
              (dragIndex === i
                ? "bg-surface shadow-2xl relative z-20"
                : "transition-all duration-150 " + (overIndex === i && dragIndex !== null ? "border-accent" : ""))
            }
            style={
              dragIndex === i
                ? { transform: `translateY(${dragOffsetY}px) scale(1.02)`, transition: "box-shadow 0.15s ease" }
                : undefined
            }
          >
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
            <AlbumArt src={t.albumImage} size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{t.name}</div>
              <div className="text-xs text-faint truncate">
                {t.artist}
                {t.handpicked ? " · handpicked" : ""}
              </div>
            </div>
            <span className="text-xs text-faint font-semibold flex-shrink-0">{fmtDuration(t.durationMs)}</span>
            <a
              href={`https://open.spotify.com/track/${t.id}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Listen to ${t.name} on Spotify`}
              className="w-6 h-6 rounded-full bg-surfaceAlt text-accent flex items-center justify-center flex-shrink-0 transition-all duration-150 active:scale-90 hover:bg-accent/10"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </a>
            <button
              onClick={() => handleRemoveTrack(t, i)}
              className="w-6 h-6 rounded-full bg-surface text-faint text-xs font-bold flex-shrink-0 transition-all duration-150 hover:bg-red-50 hover:text-red-500 active:scale-90"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          onClick={() => setShowAdd((s) => !s)}
          className="flex items-center gap-2 text-sm font-bold text-accent pt-4 transition-opacity active:opacity-60"
        >
          <span className="w-6 h-6 rounded-full border border-dashed border-accent flex items-center justify-center transition-transform duration-200">
            {showAdd ? "−" : "+"}
          </span>
          Add a song
        </button>

        {showAdd && (
          <div className="mt-3 bg-surface border border-line rounded-2xl p-3 animate-fade-slide-up">
            {!chosenArtist ? (
              <>
                <input
                  autoFocus
                  value={addArtistQuery}
                  onChange={(e) => searchArtist(e.target.value)}
                  placeholder="Search an artist"
                  className="w-full bg-surfaceAlt border border-line rounded-xl px-3 py-2 text-sm mb-2 outline-none transition-shadow focus:ring-2 focus:ring-accent/30"
                />
                {addArtistResults.map((a, i) => (
                  <button
                    key={a.id}
                    onClick={() => setChosenArtist({ id: a.id, name: a.name })}
                    className="flex items-center justify-between w-full py-1.5 text-left animate-fade-slide-up transition-opacity active:opacity-60"
                    style={{ animationDelay: `${i * 25}ms` }}
                  >
                    <span className="text-xs font-semibold">{a.name}</span>
                    <span className="text-[11px] text-accent font-bold">Select</span>
                  </button>
                ))}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2 animate-pop-in">
                  <span className="text-xs font-bold">{chosenArtist.name}</span>
                  <button onClick={() => setChosenArtist(null)} className="text-[11px] text-faint transition-opacity active:opacity-60">
                    Change
                  </button>
                </div>
                <input
                  autoFocus
                  value={addTrackQuery}
                  onChange={(e) => searchTrack(e.target.value)}
                  placeholder="Search a song title"
                  className="w-full bg-surfaceAlt border border-line rounded-xl px-3 py-2 text-sm mb-2 outline-none transition-shadow focus:ring-2 focus:ring-accent/30"
                />
                {addTrackResults.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-1.5 animate-fade-slide-up"
                    style={{ animationDelay: `${i * 25}ms` }}
                  >
                    <span className="text-xs truncate">{t.name}</span>
                    <button
                      onClick={() => { haptic(HAPTIC.add); addTrackToPlaylist({ ...t, sourceArtistId: chosenArtist.id, handpicked: true }); }}
                      className="text-[11px] font-bold text-accent flex-shrink-0 ml-2 transition-transform duration-150 active:scale-90"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {removeToast && <UndoToast message={removeToast.message} onUndo={undoRemoveTrack} className="bottom-36" />}

      <div className="fixed bottom-16 left-0 right-0 z-20 bg-surfaceAlt/95 backdrop-blur border-t border-line px-6 pt-4 pb-4 shadow-[0_-8px_24px_-12px_rgba(20,22,20,0.18)]">
        <div className="max-w-lg mx-auto">
          <GradientButton onClick={() => router.push("/lineup/create")} disabled={playlist.length === 0} glow={playlist.length > 0}>
            Create playlist
          </GradientButton>
        </div>
      </div>
    </main>
  );
}
