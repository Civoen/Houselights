"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLineup } from "@/lib/lineupStore";
import { GradientButton } from "@/components/GradientButton";
import { AlbumArt } from "@/components/AlbumArt";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { UndoToast } from "@/components/UndoToast";
import { SegmentedControl } from "@/components/SegmentedControl";
import { haptic, HAPTIC } from "@/lib/haptics";
import { useReorder, useGroupedReorder } from "@/lib/useReorder";
import { useUndoToast } from "@/lib/useUndoToast";
import { PlaylistTrack } from "@/lib/types";
import { copy } from "@/lib/copy";
import { fmtMinutes } from "@/lib/format";
import { buildArtistColorMap } from "@/lib/artistColors";

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

interface ArtistGroup {
  id: string;
  name: string;
  image?: string;
  tracks: { track: PlaylistTrack; index: number }[];
}

export default function PreviewPage() {
  const router = useRouter();
  const { lineup, playlist, eventDate, setEventDate, removeTrack, restoreTrack, reorderTrack, addTrackToPlaylist, setPlaylist } = useLineup();
  const eventDateInputRef = useRef<HTMLInputElement>(null);
  const [addArtistQuery, setAddArtistQuery] = useState("");
  const [addArtistResults, setAddArtistResults] = useState<any[]>([]);
  const [chosenArtist, setChosenArtist] = useState<{ id: string; name: string } | null>(null);
  const [addTrackQuery, setAddTrackQuery] = useState("");
  const [addTrackResults, setAddTrackResults] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [orderMode, setOrderMode] = useState<string>("headliner");
  const [expandedArtists, setExpandedArtists] = useState<Set<string>>(new Set());

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
  const artistColorMap = buildArtistColorMap(lineup);

  // Contiguous runs of same-artist tracks in the current flat order — used
  // to draw the colored box around each artist's block of songs. Recomputed
  // from whatever order the tracks are actually in right now, so it stays
  // accurate through Hype/Headliner sorting and manual drag reordering
  // alike, including a track dragged into the middle of a different
  // artist's block splitting that block into two.
  const segments: { artistId: string; items: { track: PlaylistTrack; index: number }[] }[] = [];
  playlist.forEach((t, i) => {
    const last = segments[segments.length - 1];
    if (last && last.artistId === t.sourceArtistId) {
      last.items.push({ track: t, index: i });
    } else {
      segments.push({ artistId: t.sourceArtistId, items: [{ track: t, index: i }] });
    }
  });

  function handleOrderChange(mode: "hype" | "headliner" | "artists") {
    haptic(HAPTIC.reorder);
    setOrderMode(mode);
    if (mode === "hype") {
      setPlaylist(orderByArtist(playlist, artistOrder, "desc"));
    } else if (mode === "headliner") {
      setPlaylist(orderByArtist(playlist, artistOrder, "asc"));
    }
    // "artists" doesn't reorder the playlist — it just changes how the
    // list is presented, grouped by artist instead of as a flat sequence.
  }

  function toggleArtistExpanded(artistId: string) {
    haptic(HAPTIC.tap);
    setExpandedArtists((prev) => {
      const next = new Set(prev);
      if (next.has(artistId)) next.delete(artistId);
      else next.add(artistId);
      return next;
    });
  }

  // Groups tracks by source artist, ordered to match the lineup (headliner
  // first). Hand-picked tracks from an artist outside the original lineup
  // still get their own group rather than being silently dropped.
  const artistGroups: ArtistGroup[] = (() => {
    const byArtist = new Map<string, { track: PlaylistTrack; index: number }[]>();
    playlist.forEach((t, i) => {
      const arr = byArtist.get(t.sourceArtistId) || [];
      arr.push({ track: t, index: i });
      byArtist.set(t.sourceArtistId, arr);
    });
    const groups: ArtistGroup[] = [];
    const seen = new Set<string>();
    lineup.forEach((entry) => {
      const tracks = byArtist.get(entry.artist.id);
      if (tracks && tracks.length > 0) {
        groups.push({ id: entry.artist.id, name: entry.artist.name, image: entry.artist.image, tracks });
        seen.add(entry.artist.id);
      }
    });
    byArtist.forEach((tracks, artistId) => {
      if (!seen.has(artistId) && tracks.length > 0) {
        groups.push({ id: artistId, name: tracks[0].track.artist, tracks });
      }
    });
    return groups;
  })();

  const artistGroupsRef = useRef(artistGroups);
  useEffect(() => {
    artistGroupsRef.current = artistGroups;
  });

  const {
    dragGroupId,
    dragIndex: groupDragIndex,
    overIndex: groupOverIndex,
    dragOffsetY: groupDragOffsetY,
    setItemRef: setGroupItemRef,
    handlePointerDown: handleGroupPointerDown,
    handlePointerMove: handleGroupPointerMove,
    handlePointerUp: handleGroupPointerUp,
    handlePointerCancel: handleGroupPointerCancel,
  } = useGroupedReorder((groupId, fromLocal, toLocal) => {
    const group = artistGroupsRef.current.find((g) => g.id === groupId);
    if (!group) return;
    const fromGlobal = group.tracks[fromLocal].index;
    const toGlobal = group.tracks[toLocal].index;
    reorderTrack(fromGlobal, toGlobal);
    haptic(HAPTIC.reorder);
  });

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
          {playlist.length} tracks · {fmtMinutes(totalMin)} · {artistCount} artists
        </p>
      </div>

      <div className="px-6 py-4 max-w-lg mx-auto">
        <div
          onClick={() => {
            try {
              eventDateInputRef.current?.showPicker?.();
            } catch {
              /* showPicker isn't supported everywhere — the input is still directly tappable as a fallback */
            }
          }}
          className="flex items-center justify-between gap-3 bg-surface rounded-2xl px-4 py-3 mb-4 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.22)] cursor-pointer"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            {copy.lineup.eventDateLabel}
            <span className="text-faint font-normal">{copy.lineup.eventDateOptional}</span>
          </div>
          <input
            ref={eventDateInputRef}
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="bg-transparent text-xs font-semibold text-ink outline-none"
          />
        </div>

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
            onChange={(id) => handleOrderChange(id as "hype" | "headliner" | "artists")}
            options={[
              { id: "hype", label: copy.preview.hype },
              { id: "headliner", label: copy.preview.headliner },
              { id: "artists", label: copy.preview.artists },
            ]}
          />
        )}

        {playlist.length > 0 && orderMode !== "artists" && (
          <div className="mb-4">
            {segments.map((seg, segIdx) => {
              const color = artistColorMap[seg.artistId] || "#93A0AB";
              return (
                <div
                  key={seg.artistId + "-" + segIdx}
                  className="rounded-2xl mb-2 px-3 overflow-hidden"
                  style={{ border: `1.5px solid ${color}`, backgroundColor: `${color}14` }}
                >
                  {seg.items.map(({ track: t, index: i }, localIdx) => (
                    <div
                      key={`${t.id}-${i}`}
                      ref={setItemRef(i)}
                      className={
                        "flex items-center gap-3 py-2.5 rounded-xl px-1 " +
                        (dragIndex === i
                          ? "bg-surfaceAlt shadow-xl relative z-20"
                          : "transition-all duration-150 " +
                            (localIdx > 0 ? "border-t border-line " : "") +
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
                        className="text-faint text-base select-none cursor-grab active:cursor-grabbing flex items-center justify-center w-7 h-7 -mx-1 flex-shrink-0"
                        style={{ touchAction: "none", WebkitTouchCallout: "none", WebkitUserSelect: "none" } as React.CSSProperties}
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
              );
            })}
          </div>
        )}

        {playlist.length > 0 && orderMode === "artists" && (
          <div className="mb-4">
            {artistGroups.map((group) => {
              const expanded = expandedArtists.has(group.id);
              const color = artistColorMap[group.id] || "#93A0AB";
              return (
                <div
                  key={group.id}
                  className="bg-surface rounded-2xl shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] mb-2 overflow-hidden"
                  style={{ borderLeft: `4px solid ${color}` }}
                >
                  <button
                    onClick={() => toggleArtistExpanded(group.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5"
                  >
                    <ArtistAvatar src={group.image} size={36} />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-bold truncate">{group.name}</div>
                      <div className="text-xs text-faint">
                        {group.tracks.length} song{group.tracks.length === 1 ? "" : "s"} added
                      </div>
                    </div>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="transition-transform duration-200 text-faint flex-shrink-0"
                      style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
                    >
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {expanded && (
                    <div className="px-3 pb-1 animate-fade-slide-up">
                      {group.tracks.map(({ track: t, index: i }, localIndex) => {
                        const isDragging = dragGroupId === group.id && groupDragIndex === localIndex;
                        const isDropTarget = dragGroupId === group.id && groupOverIndex === localIndex && groupDragIndex !== null;
                        return (
                          <div
                            key={`${t.id}-${i}`}
                            ref={setGroupItemRef(group.id, localIndex)}
                            className={
                              "flex items-center gap-3 py-2.5 rounded-xl px-1 " +
                              (isDragging
                                ? "bg-surfaceAlt shadow-xl relative z-20"
                                : "transition-all duration-150 border-t border-line " +
                                  (isDropTarget ? "ring-2 ring-accent" : ""))
                            }
                            style={
                              isDragging
                                ? { transform: `translateY(${groupDragOffsetY}px) scale(1.02)`, transition: "box-shadow 0.15s ease" }
                                : undefined
                            }
                          >
                            <span
                              onPointerDown={handleGroupPointerDown(group.id, localIndex)}
                              onPointerMove={handleGroupPointerMove}
                              onPointerUp={handleGroupPointerUp}
                              onPointerCancel={handleGroupPointerCancel}
                              className="text-faint text-base select-none cursor-grab active:cursor-grabbing flex items-center justify-center w-7 h-7 -mx-1 flex-shrink-0"
                              style={{ touchAction: "none", WebkitTouchCallout: "none", WebkitUserSelect: "none" } as React.CSSProperties}
                            >
                              ⠿
                            </span>
                            <AlbumArt src={t.albumImage} size={32} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold truncate">{t.name}</div>
                              <div className="text-xs text-faint truncate">
                                {t.handpicked ? "Handpicked" : "\u00A0"}
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
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
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
