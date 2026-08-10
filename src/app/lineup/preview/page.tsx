"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLineup } from "@/lib/lineupStore";
import { GradientButton } from "@/components/GradientButton";
import { AlbumArt } from "@/components/AlbumArt";
import { UndoToast } from "@/components/UndoToast";
import { SegmentedControl } from "@/components/SegmentedControl";
import { haptic, HAPTIC } from "@/lib/haptics";
import { useReorder } from "@/lib/useReorder";
import { useUndoToast } from "@/lib/useUndoToast";
import { PlaylistTrack } from "@/lib/types";
import { copy } from "@/lib/copy";

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
  const [orderMode, setOrderMode] = useState<string>("headliner");

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
    setOrderMode(mode);
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
    <main className="min-h-screen pb-40 animate-fade-slide-up">
      <div className="px-6 pb-2 pt-[calc(env(safe-area-inset-top)+1.5rem)] max-w-lg mx-auto w-full">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-surfaceAlt text-muted flex items-center justify-center transition-transform duration-150 active:scale-90 mb-3"
        >
          ‹
        </button>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-1">{copy.preview.title}</h1>
        <p className="text-sm text-muted font-medium">
          {playlist.length} tracks · {totalMin} min · {artistCount} artists
        </p>
      </div>

      <div className="px-6 py-4 max-w-lg mx-auto">
        {playlist.length === 0 && (
          <p className="text-sm text-faint text-center py-10">
            {copy.preview.emptyState}
          </p>
        )}

        {playlist.length > 0 && (
          <p className="text-[11px] text-faint mb-3">
            {copy.preview.previewHintPrefix} <span className="text-accent">▶</span> {copy.preview.previewHintSuffix}
          </p>
        )}

        {playlist.length > 0 && (
          <SegmentedControl
            className="mb-4"
            value={orderMode}
            onChange={(id) => applyOrder(id as "hype" | "headliner" | "shuffle")}
            options={[
              { id: "hype", label: copy.preview.hype },
              { id: "headliner", label: copy.preview.headliner },
              { id: "shuffle", label: copy.preview.shuffle },
            ]}
          />
        )}

        {playlist.length > 0 && (
          <div className="bg-surface rounded-2xl shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] px-3 mb-4">
            {playlist.map((t, i) => (
              <div
                key={`${t.id}-${i}`}
                ref={setItemRef(i)}
                className={
                  "flex items-center gap-3 py-2.5 rounded-xl px-1 " +
                  (dragIndex === i
                    ? "bg-surfaceAlt shadow-xl relative z-20"
                    : "transition-all duration-150 " +
                      (i > 0 ? "border-t border-line " : "") +
                      (overIndex === i && dragIndex !== null ? "ring-2 ring-accent" : ""))
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
                  className="w-6 h-6 rounded-full bg-surfaceAlt text-faint text-xs font-bold flex-shrink-0 transition-all duration-150 hover:bg-red-50 hover:text-red-500 active:scale-90"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowAdd((s) => !s)}
          className="flex items-center gap-2 text-sm font-bold text-accent pt-1 transition-opacity active:opacity-60"
        >
          <span className="w-6 h-6 rounded-full border border-dashed border-accent flex items-center justify-center transition-transform duration-200">
            {showAdd ? "−" : "+"}
          </span>
          {copy.preview.addSong}
        </button>

        {showAdd && (
          <div className="mt-3 bg-surface rounded-2xl p-3 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] animate-fade-slide-up">
            {!chosenArtist ? (
              <>
                <input
                  autoFocus
                  value={addArtistQuery}
                  onChange={(e) => searchArtist(e.target.value)}
                  placeholder={copy.preview.searchArtistPlaceholder}
                  className="w-full bg-surfaceAlt rounded-xl px-3 py-2 text-sm mb-2 outline-none transition-shadow focus:ring-2 focus:ring-accent/30"
                />
                {addArtistResults.map((a, i) => (
                  <button
                    key={a.id}
                    onClick={() => setChosenArtist({ id: a.id, name: a.name })}
                    className="flex items-center justify-between w-full py-1.5 text-left animate-fade-slide-up transition-opacity active:opacity-60"
                    style={{ animationDelay: `${i * 25}ms` }}
                  >
                    <span className="text-xs font-semibold">{a.name}</span>
                    <span className="text-[11px] text-accent font-bold">{copy.preview.select}</span>
                  </button>
                ))}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2 animate-pop-in">
                  <span className="text-xs font-bold">{chosenArtist.name}</span>
                  <button onClick={() => setChosenArtist(null)} className="text-[11px] text-faint transition-opacity active:opacity-60">
                    {copy.preview.change}
                  </button>
                </div>
                <input
                  autoFocus
                  value={addTrackQuery}
                  onChange={(e) => searchTrack(e.target.value)}
                  placeholder={copy.preview.searchSongPlaceholder}
                  className="w-full bg-surfaceAlt rounded-xl px-3 py-2 text-sm mb-2 outline-none transition-shadow focus:ring-2 focus:ring-accent/30"
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
                      {copy.preview.add}
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {removeToast && <UndoToast message={removeToast.message} onUndo={undoRemoveTrack} className="bottom-36" />}

      <div className="fixed left-6 right-6 bottom-[calc(4rem+16px+env(safe-area-inset-bottom))] z-20 max-w-lg mx-auto">
        <GradientButton
          onClick={() => router.push("/lineup/create")}
          disabled={playlist.length === 0}
          className="shadow-[0_16px_36px_-12px_rgba(17,80,103,0.55)]"
        >
          {copy.preview.createButton}
        </GradientButton>
      </div>
    </main>
  );
}
