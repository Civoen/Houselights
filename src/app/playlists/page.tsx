"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAllEvents, saveAllEvents, getPastDatedEvents, getUpcomingEvents } from "@/lib/eventHistory";
import { useLineup } from "@/lib/lineupStore";
import { PastEvent } from "@/lib/types";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { haptic, HAPTIC } from "@/lib/haptics";
import { useReorder } from "@/lib/useReorder";
import { SettingsButton } from "@/components/SettingsButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { copy } from "@/lib/copy";

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

function daysAgo(dateStr: string) {
  return Math.round(
    (new Date(new Date().toDateString()).getTime() - new Date(dateStr + "T00:00:00").getTime()) / 86400000
  );
}

function formatPastLabel(days: number) {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export default function PlaylistsPage() {
  const router = useRouter();
  const { reset, addArtist } = useLineup();
  const [events, setEvents] = useState<PastEvent[]>([]);
  const [upcoming, setUpcoming] = useState<PastEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [showPrevious, setShowPrevious] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEvents(getAllEvents());
    setUpcoming(getUpcomingEvents());
    setPastEvents(getPastDatedEvents());
    setLoaded(true);
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

  function buildAgain(e: PastEvent) {
    if (!e.headliner?.id) return;
    haptic(HAPTIC.add);
    reset();
    addArtist(e.headliner);
    router.push("/lineup");
  }

  const totalSongs = events.reduce((s, e) => s + e.trackCount, 0);

  return (
    <main className="min-h-screen pb-24 animate-fade-slide-up">
      <div className="px-6 pb-2 pt-[calc(env(safe-area-inset-top)+1.5rem)] max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-3xl font-bold tracking-tight">{copy.playlists.title}</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle className="w-9 h-9 rounded-full bg-surfaceAlt text-muted" />
            <SettingsButton className="w-9 h-9 rounded-full bg-surfaceAlt text-muted" />
          </div>
        </div>
        <p className="text-sm text-muted font-medium">
          {events.length > 0
            ? `${events.length} show${events.length === 1 ? "" : "s"} prepped · ${totalSongs} songs queued up`
            : copy.playlists.subtitleEmpty}
        </p>
      </div>

      <div className="px-6 pt-2 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-2 mt-1">
          <h2 className="text-xs font-extrabold uppercase tracking-wide text-faint">
            {copy.nextUp.title}
            {upcoming.length > 0 && <span> · {upcoming.length}</span>}
          </h2>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-xs text-faint pb-4">{copy.nextUp.emptyMessage}</p>
        ) : (
          <div className="bg-surface rounded-2xl shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] px-4 mb-4">
            {upcoming.map((e, i) => (
              <a
                key={e.id + e.createdAt}
                href={e.url}
                target="_blank"
                rel="noreferrer"
                className={
                  "flex items-center gap-3 py-3.5 transition-transform duration-150 active:scale-[0.99] " +
                  (i > 0 ? "border-t border-line" : "")
                }
              >
                <ArtistAvatar src={e.headliner?.image} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{e.headliner?.name || e.name}</div>
                  <div className="text-xs text-faint truncate">{e.artistNames.join(", ")}</div>
                </div>
                <span className="text-xs font-bold text-accent flex-shrink-0">
                  {formatCountdown(daysUntil(e.eventDate!))}
                </span>
              </a>
            ))}
          </div>
        )}

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
          <div className="bg-surface rounded-2xl shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] px-4 mt-2 animate-fade-slide-up">
            {pastEvents.length === 0 ? (
              <p className="text-xs text-faint py-4 text-center">{copy.playlists.previousEventsEmpty}</p>
            ) : (
              pastEvents.map((e, i) => (
                <a
                  key={e.id + e.createdAt}
                  href={e.url}
                  target="_blank"
                  rel="noreferrer"
                  className={
                    "flex items-center gap-3 py-3.5 transition-transform duration-150 active:scale-[0.99] " +
                    (i > 0 ? "border-t border-line" : "")
                  }
                >
                  <ArtistAvatar src={e.headliner?.image} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{e.headliner?.name || e.name}</div>
                    <div className="text-xs text-faint truncate">{e.artistNames.join(", ")}</div>
                  </div>
                  <span className="text-xs font-bold text-faint flex-shrink-0">{formatPastLabel(daysAgo(e.eventDate!))}</span>
                </a>
              ))
            )}
          </div>
        )}
      </div>

      <div className="px-6 py-5 max-w-lg mx-auto">
        {loaded && events.length > 0 && (
          <h2 className="text-xs font-extrabold uppercase tracking-wide text-faint mb-2">
            {copy.playlists.title} · {events.length}
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

        {events.map((e, i) => (
          <div
            key={e.id + e.createdAt}
            ref={setItemRef(i)}
            className={
              "flex items-start gap-3 bg-surface rounded-2xl p-4 mb-3 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] " +
              (dragIndex === i
                ? "shadow-2xl relative z-20"
                : "animate-fade-slide-up transition-all duration-150 " +
                  (overIndex === i && dragIndex !== null ? "ring-2 ring-accent" : ""))
            }
            style={
              dragIndex === i
                ? { transform: `translateY(${dragOffsetY}px) scale(1.02)`, transition: "box-shadow 0.15s ease" }
                : { animationDelay: `${i * 30}ms` }
            }
          >
            <span
              onPointerDown={handlePointerDown(i)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              className="text-faint text-base select-none cursor-grab active:cursor-grabbing pt-1 px-1 -mx-1"
              style={{ touchAction: "none" }}
            >
              ⠿
            </span>
            <ArtistAvatar src={e.headliner?.image} size={38} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="text-sm font-bold truncate">{e.name}</div>
                <span className="text-[11px] text-faint flex-shrink-0">
                  {new Date(e.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </span>
              </div>
              <div className="text-xs text-faint mb-2 truncate">{e.artistNames.join(", ")}</div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted font-semibold flex-shrink-0">
                  {e.trackCount} tracks · {e.totalMinutes} min
                </span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {e.headliner?.id && (
                    <button
                      onClick={() => buildAgain(e)}
                      className="text-[11px] font-bold text-accent transition-transform duration-150 active:scale-90"
                    >
                      {copy.playlists.buildAgain}
                    </button>
                  )}
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-muted flex items-center gap-1 transition-transform duration-150 active:scale-90"
                  >
                    {copy.playlists.open}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
