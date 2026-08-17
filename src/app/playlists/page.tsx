"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAllEvents, saveAllEvents, getPastDatedEvents, getUpcomingEvents } from "@/lib/eventHistory";
import { getAllDrafts, removeDraft as removeDraftFromStorage } from "@/lib/drafts";
import { useLineup } from "@/lib/lineupStore";
import { useConnectionStatus } from "@/lib/useConnectionStatus";
import { PastEvent, PlaylistTrack, SpotifyTrack, DraftPlaylist } from "@/lib/types";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { UndoToast } from "@/components/UndoToast";
import { EqSpinner } from "@/components/EqSpinner";
import { haptic, HAPTIC } from "@/lib/haptics";
import { useReorder } from "@/lib/useReorder";
import { copy } from "@/lib/copy";
import { fmtMinutes } from "@/lib/format";


function daysUntil(dateStr: string) {
  return Math.round(
    (new Date(dateStr + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime()) / 86400000
  );
}

function formatCountdown(days: number) {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

export default function PlaylistsPage() {
  const router = useRouter();
  const connected = useConnectionStatus();
  const { reset, addArtist, restoreFullLineup, setPlaylist, setPlaylistMeta, setEventDate, setPlaylistSize, setEditingPlaylistId, setResumedDraftId } =
    useLineup();
  const [events, setEvents] = useState<PastEvent[]>([]);
  const [upcoming, setUpcoming] = useState<PastEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [drafts, setDrafts] = useState<DraftPlaylist[]>([]);
  const [showPrevious, setShowPrevious] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [removedPlaylist, setRemovedPlaylist] = useState<{ event: PastEvent; index: number } | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [previewErrorId, setPreviewErrorId] = useState<string | null>(null);
  const [previewErrorKind, setPreviewErrorKind] = useState<"scope" | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");


  // The main list excludes anything whose event date has already passed —
  // those live in the "Previous events" section instead now. Indices are
  // preserved from the full `events` array (not re-numbered), since
  // reorder/remove/drag all operate on that array's real positions.
  const todayStr = new Date().toISOString().slice(0, 10);
  const visibleEvents = events
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => !(e.eventDate && e.eventDate < todayStr));

  // One query drives search across the main list, Previous Events, and
  // Drafts alike — matches on playlist name or any artist in the lineup,
  // case-insensitively. Empty query matches everything, so this is a
  // no-op filter until someone actually types.
  const trimmedQuery = searchQuery.trim().toLowerCase();
  function matchesSearch(name: string, artistNames: string[]): boolean {
    if (!trimmedQuery) return true;
    return name.toLowerCase().includes(trimmedQuery) || artistNames.some((a) => a.toLowerCase().includes(trimmedQuery));
  }
  const filteredVisibleEvents = visibleEvents.filter(({ e }) => matchesSearch(e.name, e.artistNames));
  const filteredPastEvents = pastEvents.filter((e) => matchesSearch(e.name, e.artistNames));
  const filteredDrafts = drafts.filter((d) => matchesSearch(d.name, d.artistNames));

  const [draftSavedToast, setDraftSavedToast] = useState(false);

  useEffect(() => {
    setEvents(getAllEvents());
    setUpcoming(getUpcomingEvents());
    setPastEvents(getPastDatedEvents());
    setDrafts(getAllDrafts());
    setLoaded(true);
    if (typeof window !== "undefined" && window.location.search.includes("draftSaved=1")) {
      setDraftSavedToast(true);
      window.history.replaceState({}, "", "/playlists");
      setTimeout(() => setDraftSavedToast(false), 3000);
    }
  }, []);

  function reorder(from: number, to: number) {
    setEvents((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      saveAllEvents(next);
      return next;
    });
  }

  const { dragIndex, overIndex, dragOffsetY, setItemRef, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel } =
    useReorder(events.length, (from, to) => {
      reorder(from, to);
      haptic(HAPTIC.reorder);
    });

  // Shared by both the main Playlists list and Previous Events — the full
  // card (avatar, stats, swipe-to-delete, Spotify/Copy link/Edit actions).
  // Drag-reorder is optional since it only makes sense for the main list;
  // reordering shows that already happened doesn't have a clear purpose.
  function renderPlaylistCard(e: PastEvent, globalIndex: number, dragEnabled: boolean) {
    const rowId = e.id + e.createdAt;
    const isThisDragging = dragEnabled && dragIndex === globalIndex;
    const isThisDropTarget = dragEnabled && overIndex === globalIndex && dragIndex !== null;

    return (
      <div
        key={rowId}
        ref={dragEnabled ? setItemRef(globalIndex) : undefined}
        onClick={(ev) => {
          if ((ev.target as HTMLElement).closest("[data-no-card-click]")) return;
          window.location.href = e.url;
        }}
        className={
          "relative bg-surface rounded-2xl p-4 mb-3 cursor-pointer " +
          (isThisDragging
            ? "shadow-2xl z-20"
            : "shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] animate-fade-slide-up transition-all duration-150 " +
              (isThisDropTarget ? "ring-2 ring-accent" : ""))
        }
        style={{
          animationDelay: isThisDragging ? undefined : `${globalIndex * 30}ms`,
          transform: isThisDragging ? `translateY(${dragOffsetY}px) scale(1.02)` : undefined,
          transition: isThisDragging ? "box-shadow 0.15s ease" : undefined,
        }}
      >
        <div className="flex items-start gap-3">
          {dragEnabled && (
            <span
              data-no-card-click
              onPointerDown={handlePointerDown(globalIndex)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              className="text-faint text-base select-none cursor-grab active:cursor-grabbing pt-1 px-1 -mx-1"
              style={{ touchAction: "none" }}
            >
              ⠿
            </span>
          )}
          <ArtistAvatar src={e.headliner?.image} size={38} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate mb-1">{e.name}</div>
            <div className="text-xs text-muted font-semibold">
              {e.trackCount} tracks · {fmtMinutes(e.totalMinutes)}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3">
          <button
            data-no-card-click
            onClick={() => {
              haptic(HAPTIC.tap);
              window.location.href = e.url;
            }}
            className="flex items-center justify-center py-2.5 rounded-xl bg-grad text-white text-[10px] font-bold transition-transform duration-150 active:scale-95"
          >
            {copy.playlists.open}
          </button>
          <button
            data-no-card-click
            onClick={() => copyLink(e)}
            className="flex items-center justify-center py-2.5 rounded-xl bg-grad text-white text-[10px] font-bold transition-transform duration-150 active:scale-95"
          >
            {copiedId === rowId ? copy.playlists.linkCopied : copy.playlists.copyLink}
          </button>
          <button
            data-no-card-click
            onClick={() => openInPreview(e)}
            disabled={previewLoadingId === rowId}
            className="flex items-center justify-center gap-1 py-2.5 rounded-xl bg-grad text-white text-[10px] font-bold transition-transform duration-150 active:scale-95 disabled:opacity-70"
          >
            {previewLoadingId === rowId && <EqSpinner className="text-white" />}
            {copy.playlists.edit}
          </button>
          <button
            data-no-card-click
            onClick={() => handleRemovePlaylist(e, globalIndex)}
            className="flex items-center justify-center py-2.5 rounded-xl bg-surfaceAlt text-red-500 text-[10px] font-bold transition-all duration-150 hover:bg-red-50 active:scale-95"
          >
            {copy.playlists.deleteAction}
          </button>
        </div>
        {previewErrorId === rowId && (
          <p className="text-[11px] text-red-600 mt-2 text-center">
            {previewErrorKind === "scope" ? (
              <>
                {copy.playlists.previewErrorScope}{" "}
                <a href="/api/auth/login?switch=1" className="underline font-bold">
                  {copy.playlists.reconnect}
                </a>
              </>
            ) : (
              copy.playlists.previewError
            )}
          </p>
        )}
      </div>
    );
  }

  function copyLink(e: PastEvent) {
    haptic(HAPTIC.tap);
    navigator.clipboard.writeText(e.url).then(() => {
      setCopiedId(e.id + e.createdAt);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  // Playlists now carry their own track snapshot from creation time (no
  // extra cost — the data was already in memory right when the playlist
  // was made). Loading Edit is instant and offline-capable for these.
  // Playlists saved before this existed don't have that snapshot, so for
  // those specifically this still falls back to re-fetching from Spotify
  // — meaning only that older subset needs network time or can hit the
  // scope/permission failure mode.
  async function openInPreview(e: PastEvent) {
    const key = e.id + e.createdAt;
    haptic(HAPTIC.tap);
    setPreviewErrorId(null);
    setPreviewErrorKind(null);

    if (e.tracks && e.tracks.length > 0) {
      loadIntoPreview(e, e.tracks);
      return;
    }

    setPreviewLoadingId(key);
    try {
      const res = await fetch(`/api/playlist/${e.id}/tracks`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.error === "insufficient_scope") {
          setPreviewErrorKind("scope");
        }
        throw new Error();
      }
      const json = await res.json();
      const sourceTracks: SpotifyTrack[] = json.tracks || [];
      if (sourceTracks.length === 0) throw new Error();

      const playlistTracks: PlaylistTrack[] = sourceTracks.map((t) => ({
        ...t,
        sourceArtistId: t.artistId,
        handpicked: false,
      }));
      loadIntoPreview(e, playlistTracks);
    } catch {
      haptic(HAPTIC.remove);
      setPreviewErrorId(key);
    } finally {
      setPreviewLoadingId(null);
    }
  }

  // A Draft's own card — deliberately simpler than a real playlist's:
  // no Spotify link, no copy-link, no Edit-via-fetch, since none of that
  // applies to something that was never actually sent to Spotify. Just
  // enough to pick it back up or discard it.
  function renderDraftCard(d: DraftPlaylist) {
    return (
      <div
        key={d.id}
        className="bg-surface rounded-2xl p-4 mb-3 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] animate-fade-slide-up"
      >
        <div className="flex items-start gap-3">
          <ArtistAvatar src={d.headliner?.image} size={38} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate mb-1">{d.name}</div>
            <div className="text-xs text-muted font-semibold">
              {d.trackCount} tracks · {fmtMinutes(d.totalMinutes)}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            onClick={() => resumeDraft(d)}
            className="py-2.5 rounded-xl bg-grad text-white text-[10px] font-bold transition-transform duration-150 active:scale-95"
          >
            {copy.playlists.resumeDraft}
          </button>
          <button
            onClick={() => handleDeleteDraft(d.id)}
            className="py-2.5 rounded-xl bg-surfaceAlt text-red-500 text-[10px] font-bold transition-all duration-150 hover:bg-red-50 active:scale-95"
          >
            {copy.playlists.deleteAction}
          </button>
        </div>
      </div>
    );
  }

  // Shared by both the instant (local snapshot) and fallback (network)
  // paths — rebuild a minimal lineup — one entry per distinct artist
  // actually present in the tracks, in order of first appearance — so
  // Preview's artist-grouping and color-coding has something to key off.
  function loadIntoPreview(e: PastEvent, tracks: PlaylistTrack[]) {
    reset();
    const seen = new Set<string>();
    tracks.forEach((t) => {
      if (!t.sourceArtistId || seen.has(t.sourceArtistId)) return;
      seen.add(t.sourceArtistId);
      addArtist({ id: t.sourceArtistId, name: t.artist, genres: [] });
    });
    setPlaylist(tracks);
    setPlaylistMeta(e.name, e.description || "");
    setEventDate(e.eventDate || "");
    setEditingPlaylistId(e.id);
    router.push("/lineup/preview");
  }

  function resumeDraft(d: DraftPlaylist) {
    reset();
    // Unlike loadIntoPreview (which has to reconstruct a lineup from track
    // metadata for playlists that predate the tracks snapshot), a Draft
    // already has the exact original LineupArtist[] — filters, weights,
    // hand-picked tracks and all — so restoreFullLineup puts it back
    // exactly as it was, not just a same-artists approximation.
    restoreFullLineup(d.lineup);
    setPlaylist(d.tracks);
    setEventDate(d.eventDate || "");
    setPlaylistSize(d.playlistSizeMode, d.playlistSizeValue);
    setResumedDraftId(d.id);
    router.push("/lineup/preview");
  }

  function handleDeleteDraft(id: string) {
    haptic(HAPTIC.remove);
    removeDraftFromStorage(id);
    setDrafts(getAllDrafts());
  }

  function handleRemovePlaylist(event: PastEvent, index: number) {
    haptic(HAPTIC.remove);
    const next = events.filter((_, i) => i !== index);
    setEvents(next);
    saveAllEvents(next);
    // events.filter/saveAllEvents only ever touched the flat `events` array
    // — pastEvents and upcoming are separate state derived from it, so
    // without this they'd keep showing the just-removed playlist even
    // though storage was already correctly updated underneath them.
    setPastEvents(getPastDatedEvents());
    setUpcoming(getUpcomingEvents());
    setRemovedPlaylist({ event, index });
  }

  // No auto-dismiss timer here on purpose — this stays up until the user
  // either undoes it or navigates away (which unmounts this page and clears
  // the state naturally), matching what was asked for.
  function undoRemovePlaylist() {
    if (!removedPlaylist) return;
    haptic(HAPTIC.add);
    const next = [...events];
    next.splice(removedPlaylist.index, 0, removedPlaylist.event);
    setEvents(next);
    saveAllEvents(next);
    setPastEvents(getPastDatedEvents());
    setUpcoming(getUpcomingEvents());
    setRemovedPlaylist(null);
  }

  const totalSongs = events.reduce((s, e) => s + e.trackCount, 0);

  return (
    <main className="min-h-screen pb-24 animate-fade-slide-up">
      <div className="px-6 pb-2 pt-[calc(env(safe-area-inset-top)+1.5rem)] max-w-lg mx-auto w-full">
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">{copy.playlists.title}</h1>
        {connected === false && (
          <div className="bg-surfaceAlt border border-green rounded-xl px-4 py-3 mb-3 flex items-center justify-between gap-3 animate-fade-slide-up">
            <span className="text-xs font-semibold text-muted">{copy.lineup.guestBanner}</span>
            <a href="/api/auth/login" className="text-[11px] font-bold text-accent underline decoration-dotted underline-offset-4 flex-shrink-0">
              {copy.lineup.guestBannerAction}
            </a>
          </div>
        )}
        <p className="text-sm text-muted font-medium mb-3">
          {events.length > 0
            ? `${events.length} show${events.length === 1 ? "" : "s"} prepped · ${totalSongs} songs queued up`
            : copy.playlists.subtitleEmpty}
        </p>
        {events.length > 0 && (
          <Link
            href="/encore"
            className="flex items-center justify-center gap-2 w-full bg-grad text-white text-sm font-bold py-3.5 rounded-2xl mb-3 transition-all duration-150 hover:brightness-[1.05] active:scale-[0.98] shadow-[0_10px_24px_-16px_rgba(10,31,38,0.3)]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 12a8 8 0 1 1 2.34 5.66M4 12v5M4 12H9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {copy.playlists.encoreButton}
          </Link>
        )}
        {(events.length > 0 || drafts.length > 0) && (
          <div className="relative">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={copy.playlists.searchPlaceholder}
              className="w-full bg-surface border border-line rounded-xl pl-10 pr-3 py-2.5 text-[16px] outline-none transition-shadow focus:ring-2 focus:ring-accent/30 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)]"
            />
          </div>
        )}
      </div>

      <div className="px-6 pt-2 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-2 mt-1">
          <h2 className="text-xs font-extrabold uppercase tracking-wide text-faint">{copy.nextUp.title}</h2>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-xs text-faint pb-4">{copy.nextUp.emptyMessage}</p>
        ) : (
          <div className="bg-surface rounded-2xl shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] px-4 mb-4">
            <a
              href={upcoming[0].url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 py-3.5 transition-transform duration-150 active:scale-[0.99]"
            >
              <ArtistAvatar src={upcoming[0].headliner?.image} size={40} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{upcoming[0].headliner?.name || upcoming[0].name}</div>
                <div className="text-xs text-faint truncate">{upcoming[0].artistNames.join(", ")}</div>
              </div>
              <span className="text-xs font-bold text-accent flex-shrink-0">
                {formatCountdown(daysUntil(upcoming[0].eventDate!))}
              </span>
            </a>
          </div>
        )}
      </div>

      <div className="px-6 py-5 max-w-lg mx-auto">
        {loaded && events.length > 0 && (
          <h2 className="text-xs font-extrabold uppercase tracking-wide text-faint mb-2">
            {copy.playlists.title} · {filteredVisibleEvents.length}
          </h2>
        )}
        {loaded && events.length === 0 && (
          <div className="text-center py-14">
            <p className="text-sm text-faint mb-5">
              {copy.playlists.emptyMessage}
            </p>
            <Link
              href="/lineup"
              className="inline-block bg-grad text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all duration-150 hover:brightness-[1.05] active:scale-[0.96]"
            >
              {copy.playlists.buildLineupLink}
            </Link>
          </div>
        )}
        {loaded && events.length > 0 && trimmedQuery && filteredVisibleEvents.length === 0 && (
          <p className="text-xs text-faint text-center py-8">{copy.playlists.searchNoResults}</p>
        )}

        {filteredVisibleEvents.map(({ e, i }) => renderPlaylistCard(e, i, true))}
      </div>

      <div className="px-6 pb-5 max-w-lg mx-auto">
        <button
          onClick={() => {
            haptic(HAPTIC.tap);
            setShowPrevious((v) => !v);
          }}
          className="w-full flex items-center justify-between bg-surface rounded-2xl px-4 py-3.5 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)]"
        >
          <span className="text-sm font-bold">
            {copy.playlists.previousEventsLabel}
            {pastEvents.length > 0 && <span className="text-faint font-semibold"> · {pastEvents.length}</span>}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            className="transition-transform duration-200 text-faint flex-shrink-0"
            style={{ transform: showPrevious ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {showPrevious && (
          <div className="mt-2 animate-fade-slide-up">
            {pastEvents.length === 0 ? (
              <div className="bg-surface rounded-2xl px-4 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)]">
                <p className="text-xs text-faint py-4 text-center">{copy.playlists.previousEventsEmpty}</p>
              </div>
            ) : filteredPastEvents.length === 0 ? (
              <div className="bg-surface rounded-2xl px-4 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)]">
                <p className="text-xs text-faint py-4 text-center">{copy.playlists.searchNoResults}</p>
              </div>
            ) : (
              filteredPastEvents.map((e) => {
                const globalIndex = events.findIndex((ev) => ev.id === e.id && ev.createdAt === e.createdAt);
                return renderPlaylistCard(e, globalIndex, false);
              })
            )}
          </div>
        )}
      </div>

      {drafts.length > 0 && (
        <div className="px-6 pb-5 max-w-lg mx-auto">
          <h2 className="text-xs font-extrabold uppercase tracking-wide text-faint mb-2">
            {copy.playlists.draftsLabel} · {filteredDrafts.length}
          </h2>
          <p className="text-xs text-faint mb-3">{copy.playlists.draftsNote}</p>
          {filteredDrafts.length === 0 ? (
            <p className="text-xs text-faint text-center py-6">{copy.playlists.searchNoResults}</p>
          ) : (
            filteredDrafts.map((d) => renderDraftCard(d))
          )}
        </div>
      )}

      {removedPlaylist && (
        <UndoToast
          message={`${copy.common.removedPrefix} ${removedPlaylist.event.name}`}
          onUndo={undoRemovePlaylist}
          className="bottom-[calc(72px+16px+env(safe-area-inset-bottom))]"
        />
      )}

      {draftSavedToast && (
        <div
          className="fixed left-6 right-6 z-50 max-w-lg mx-auto animate-fade-slide-up"
          style={{ bottom: "calc(72px + 16px + env(safe-area-inset-bottom))" }}
        >
          <div className="bg-navy text-white text-xs font-semibold pl-4 pr-4 py-2.5 rounded-full shadow-lg text-center">
            {copy.playlists.draftSavedToast}
          </div>
        </div>
      )}
    </main>
  );
}
