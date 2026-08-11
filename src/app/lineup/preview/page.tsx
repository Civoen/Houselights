"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLineup } from "@/lib/lineupStore";
import { GradientButton } from "@/components/GradientButton";
import { AlbumArt } from "@/components/AlbumArt";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { UndoToast } from "@/components/UndoToast";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SettingsButton } from "@/components/SettingsButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { haptic, HAPTIC } from "@/lib/haptics";
import { useReorder, useGroupedReorder } from "@/lib/useReorder";
import { useUndoToast } from "@/lib/useUndoToast";
import { PlaylistTrack, LineupArtist } from "@/lib/types";
import { copy } from "@/lib/copy";
import { fmtMinutes } from "@/lib/format";
import { buildArtistColorMap } from "@/lib/artistColors";

function fmtDuration(ms: number) {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

interface ArtistGroup {
  id: string;
  name: string;
  image?: string;
  tracks: { track: PlaylistTrack; index: number }[];
}

export default function PreviewPage() {
  const router = useRouter();
  const {
    lineup,
    playlist,
    eventDate,
    setEventDate,
    removeTrack,
    restoreTrack,
    reorderTrack,
    addTrackToPlaylist,
    setPlaylist,
    removeArtist,
    restoreArtist,
    reorderArtist,
  } = useLineup();
  const eventDateInputRef = useRef<HTMLInputElement>(null);
  const [addingSongForId, setAddingSongForId] = useState<string | null>(null);
  const [addTrackQuery, setAddTrackQuery] = useState("");
  const [addTrackResults, setAddTrackResults] = useState<any[]>([]);
  // Two independent axes, not one three-way toggle: viewMode picks how the
  // playlist is displayed (grouped by artist, or a flat song list);
  // groupOrder only matters while viewMode is "grouped" — it can't combine
  // with shuffling, since a shuffled order isn't "headliner first" or
  // "hype" by definition, so shuffle lives as an action on the flat view
  // instead of a third peer state.
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [groupOrder, setGroupOrder] = useState<"hype" | "headliner">("headliner");
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

  const { toast: removeArtistToast, show: showRemoveArtistToast, dismiss: dismissRemoveArtistToast } = useUndoToast<{
    lineupEntry: LineupArtist | null;
    lineupIndex: number;
    tracks: { track: PlaylistTrack; index: number }[];
  }>();

  function handleRemoveArtistGroup(group: ArtistGroup) {
    haptic(HAPTIC.remove);
    const removeIndices = new Set(group.tracks.map((t) => t.index));
    setPlaylist(playlist.filter((_, i) => !removeIndices.has(i)));

    const lineupIndex = lineup.findIndex((a) => a.artist.id === group.id);
    const lineupEntry = lineupIndex >= 0 ? lineup[lineupIndex] : null;
    if (lineupEntry) removeArtist(group.id);

    setExpandedArtists((prev) => {
      if (!prev.has(group.id)) return prev;
      const next = new Set(prev);
      next.delete(group.id);
      return next;
    });
    if (addingSongForId === group.id) setAddingSongForId(null);

    showRemoveArtistToast(`Removed ${group.name}`, {
      lineupEntry,
      lineupIndex,
      tracks: [...group.tracks].sort((a, b) => a.index - b.index),
    });
  }

  function undoRemoveArtistGroup() {
    if (!removeArtistToast) return;
    const { lineupEntry, lineupIndex, tracks } = removeArtistToast.payload;
    if (lineupEntry) restoreArtist(lineupEntry, lineupIndex);
    // Restore in ascending original-index order — each splice-insert shifts
    // everything at/after it right by one, so ascending order is what
    // correctly reconstructs the original positions instead of drifting.
    tracks.forEach(({ track, index }) => restoreTrack(track, index));
    dismissRemoveArtistToast();
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

  function handleGroupOrderChange(order: "hype" | "headliner") {
    haptic(HAPTIC.reorder);
    setGroupOrder(order);
    // Doesn't touch the track array at all — just changes which order the
    // artist group CARDS appear in (handled below, in artistGroups).
  }

  function handleShuffle() {
    haptic(HAPTIC.reorder);
    setPlaylist(shuffleTracks(playlist));
  }

  function shuffleTracks(tracks: PlaylistTrack[]): PlaylistTrack[] {
    const arr = [...tracks];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
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

  // Groups tracks by source artist. Card order follows groupOrder: Headliner
  // (and the default Artists view) puts the lineup's headliner first; Hype
  // reverses that, building up toward the headliner instead. Hand-picked
  // tracks from an artist outside the original lineup still get their own
  // group, appended at the end, rather than being silently dropped.
  const artistGroups: ArtistGroup[] = (() => {
    const byArtist = new Map<string, { track: PlaylistTrack; index: number }[]>();
    playlist.forEach((t, i) => {
      const arr = byArtist.get(t.sourceArtistId) || [];
      arr.push({ track: t, index: i });
      byArtist.set(t.sourceArtistId, arr);
    });
    const orderedLineup = groupOrder === "hype" ? [...lineup].reverse() : lineup;
    const groups: ArtistGroup[] = [];
    const seen = new Set<string>();
    orderedLineup.forEach((entry) => {
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
    dragIndex: cardDragIndex,
    overIndex: cardOverIndex,
    dragOffsetY: cardDragOffsetY,
    setItemRef: setGroupCardRef,
    handlePointerDown: handleGroupCardPointerDown,
    handlePointerMove: handleGroupCardPointerMove,
    handlePointerUp: handleGroupCardPointerUp,
    handlePointerCancel: handleGroupCardPointerCancel,
  } = useReorder(artistGroups.length, (fromVisual, toVisual) => {
    // artistGroups can be showing the reversed (Hype) order, so a visual
    // drag position doesn't map 1:1 onto `lineup`'s own index — resolve
    // both ends back to the artist's real position in `lineup` via id
    // before reordering, rather than assuming visual === underlying order.
    const groups = artistGroupsRef.current;
    const fromId = groups[fromVisual]?.id;
    const toId = groups[toVisual]?.id;
    if (!fromId || !toId) return;
    const fromLineupIndex = lineup.findIndex((a) => a.artist.id === fromId);
    const toLineupIndex = lineup.findIndex((a) => a.artist.id === toId);
    if (fromLineupIndex === -1 || toLineupIndex === -1) return;
    reorderArtist(fromLineupIndex, toLineupIndex);
    haptic(HAPTIC.reorder);
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

  function toggleAddSong(artistId: string) {
    haptic(HAPTIC.tap);
    setAddingSongForId((current) => (current === artistId ? null : artistId));
    setAddTrackQuery("");
    setAddTrackResults([]);
  }

  async function searchTrack(artistId: string, artistName: string, q: string) {
    setAddTrackQuery(q);
    if (q.trim().length < 2) {
      setAddTrackResults([]);
      return;
    }
    const params = new URLSearchParams({ artistId, artistName, pickQuery: q });
    const res = await fetch(`/api/spotify/artist-tracks?${params.toString()}`);
    if (res.ok) {
      const json = await res.json();
      setAddTrackResults(json.tracks || []);
    }
  }

  function addSongResult(artistId: string, t: any) {
    haptic(HAPTIC.add);
    addTrackToPlaylist({ ...t, sourceArtistId: artistId, handpicked: true });
  }

  // A plain render helper, not a nested component — defining a component
  // function inside another component's body would give it a new identity
  // every render, remounting the input (and dropping focus) on every
  // keystroke. This just builds JSX inline instead.
  function renderAddSongPanel(artistId: string, artistName: string) {
    const isOpen = addingSongForId === artistId;
    return (
      <div className="pt-1">
        <button
          onClick={() => toggleAddSong(artistId)}
          className="w-full flex items-center gap-2 text-xs font-bold text-accent py-2 transition-opacity active:opacity-60"
        >
          <span className="w-5 h-5 rounded-full border border-dashed border-accent flex items-center justify-center text-[11px] transition-transform duration-200 flex-shrink-0">
            {isOpen ? "−" : "+"}
          </span>
          {copy.preview.addSong}
        </button>
        {isOpen && (
          <div className="pb-2 animate-fade-slide-up">
            <input
              autoFocus
              value={addTrackQuery}
              onChange={(e) => searchTrack(artistId, artistName, e.target.value)}
              placeholder={copy.preview.searchSongPlaceholder}
              className="w-full bg-surfaceAlt rounded-xl px-3 py-2 text-[16px] mb-2 outline-none transition-shadow focus:ring-2 focus:ring-accent/30"
            />
            {addTrackResults.map((t, i) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-1.5 animate-fade-slide-up"
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <span className="text-xs truncate">{t.name}</span>
                <button
                  onClick={() => addSongResult(artistId, t)}
                  className="text-[11px] font-bold text-accent flex-shrink-0 ml-2 transition-transform duration-150 active:scale-90"
                >
                  {copy.preview.add}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-40 animate-fade-slide-up">
      <div className="px-6 pb-2 pt-[calc(env(safe-area-inset-top)+1.5rem)] max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => router.push("/lineup")}
            className="w-11 h-11 rounded-full bg-surfaceAlt text-muted text-xl flex items-center justify-center transition-transform duration-150 active:scale-90"
          >
            ‹
          </button>
          <div className="flex items-center gap-2">
            <ThemeToggle className="w-9 h-9 rounded-full bg-surfaceAlt text-muted" />
            <SettingsButton className="w-9 h-9 rounded-full bg-surfaceAlt text-muted" />
          </div>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-1">{copy.preview.title}</h1>
        <p className="text-sm text-muted font-medium">
          {playlist.length} tracks · {fmtMinutes(totalMin)} · {artistCount} artists
        </p>
      </div>

      <div className="px-6 py-4 max-w-lg mx-auto">
        <div
          onClick={() => {
            const el = eventDateInputRef.current;
            if (!el) return;
            try {
              el.showPicker?.();
            } catch {
              /* showPicker isn't supported everywhere for type="date" — focus() below is the real fallback */
            }
            el.focus();
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
            className="bg-transparent text-[16px] font-semibold text-ink outline-none"
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
            className="mb-2"
            value={viewMode}
            onChange={(id) => {
              haptic(HAPTIC.tap);
              setViewMode(id as "grouped" | "flat");
            }}
            options={[
              { id: "grouped", label: copy.preview.viewArtists },
              { id: "flat", label: copy.preview.viewSongs },
            ]}
          />
        )}

        {playlist.length > 0 && viewMode === "grouped" && (
          <SegmentedControl
            className="mb-4"
            value={groupOrder}
            onChange={(id) => handleGroupOrderChange(id as "hype" | "headliner")}
            options={[
              { id: "hype", label: copy.preview.hype },
              { id: "headliner", label: copy.preview.headliner },
            ]}
          />
        )}

        {playlist.length > 0 && viewMode === "flat" && (
          <button
            onClick={handleShuffle}
            className="w-full flex items-center justify-center gap-2 py-2.5 mb-4 rounded-xl bg-surfaceAlt text-muted text-xs font-bold transition-all duration-150 active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 6h3.5c1.5 0 2.5.7 3.3 1.8L15 18c.8 1.1 1.8 1.8 3.3 1.8H21M3 18h3.5c1.5 0 2.5-.7 3.3-1.8l.7-1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M18 3l3 3-3 3M18 15l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {copy.preview.shuffle}
          </button>
        )}

        {playlist.length > 0 && viewMode === "flat" && (
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
                  {renderAddSongPanel(seg.artistId, seg.items[0].track.artist)}
                </div>
              );
            })}
          </div>
        )}

        {playlist.length > 0 && viewMode === "grouped" && (
          <div className="mb-4">
            {artistGroups.map((group, i) => {
              const expanded = expandedArtists.has(group.id);
              const color = artistColorMap[group.id] || "#93A0AB";
              const isDragging = cardDragIndex === i;
              const isDropTarget = cardOverIndex === i && cardDragIndex !== null && !isDragging;
              return (
                <div
                  key={group.id}
                  ref={setGroupCardRef(i)}
                  className={
                    "bg-surface rounded-2xl shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] mb-2 overflow-hidden " +
                    (isDragging ? "shadow-2xl relative z-20" : "transition-all duration-150 " + (isDropTarget ? "ring-2 ring-accent" : ""))
                  }
                  style={{
                    borderLeft: `4px solid ${color}`,
                    ...(isDragging ? { transform: `translateY(${cardDragOffsetY}px) scale(1.02)`, transition: "box-shadow 0.15s ease" } : {}),
                  }}
                >
                  <div className="flex items-center gap-1 pl-1 pr-2">
                    <span
                      data-no-swipe
                      onPointerDown={handleGroupCardPointerDown(i)}
                      onPointerMove={handleGroupCardPointerMove}
                      onPointerUp={handleGroupCardPointerUp}
                      onPointerCancel={handleGroupCardPointerCancel}
                      className="text-faint text-base select-none cursor-grab active:cursor-grabbing flex items-center justify-center w-8 h-8 flex-shrink-0"
                      style={{ touchAction: "none", WebkitTouchCallout: "none", WebkitUserSelect: "none" } as React.CSSProperties}
                    >
                      ⠿
                    </span>
                    <button
                      onClick={() => toggleArtistExpanded(group.id)}
                      className="flex-1 min-w-0 flex items-center gap-3 py-2.5 text-left"
                    >
                      <ArtistAvatar src={group.image} size={36} />
                      <div className="flex-1 min-w-0">
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
                    <button
                      onClick={() => handleRemoveArtistGroup(group)}
                      aria-label={`Remove ${group.name}`}
                      className="w-7 h-7 rounded-full bg-surfaceAlt text-faint text-xs font-bold flex-shrink-0 flex items-center justify-center transition-all duration-150 hover:bg-red-50 hover:text-red-500 active:scale-90"
                    >
                      ✕
                    </button>
                  </div>

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
                              {t.handpicked && <div className="text-xs text-faint truncate">Handpicked</div>}
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
                      {renderAddSongPanel(group.id, group.name)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {removeToast && <UndoToast message={removeToast.message} onUndo={undoRemoveTrack} className="bottom-36" />}
      {removeArtistToast && <UndoToast message={removeArtistToast.message} onUndo={undoRemoveArtistGroup} className="bottom-36" />}

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
