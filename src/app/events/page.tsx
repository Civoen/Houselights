"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPastEvents, savePastEvents } from "@/lib/eventHistory";
import { useLineup } from "@/lib/lineupStore";
import { PastEvent } from "@/lib/types";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { haptic, HAPTIC } from "@/lib/haptics";
import { useReorder } from "@/lib/useReorder";
import { SettingsButton } from "@/components/SettingsButton";

export default function EventsPage() {
  const router = useRouter();
  const { reset, addArtist } = useLineup();
  const [events, setEvents] = useState<PastEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEvents(getPastEvents());
    setLoaded(true);
  }, []);

  function reorder(from: number, to: number) {
    setEvents((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      savePastEvents(next);
      return next;
    });
  }

  const { dragIndex, overIndex, setItemRef, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel } =
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
      <div className="bg-grad text-white px-6 pt-10 pb-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Previous events</h1>
          <SettingsButton className="w-8 h-8 rounded-full bg-white/20 text-white" />
        </div>
        <p className="text-sm opacity-90 mt-1">
          {events.length > 0
            ? `${events.length} show${events.length === 1 ? "" : "s"} prepped · ${totalSongs} songs queued up`
            : "Playlists you've already sent to Spotify"}
        </p>
      </div>

      <div className="px-6 py-5 max-w-lg mx-auto">
        {loaded && events.length === 0 && (
          <div className="text-center py-14">
            <p className="text-sm text-faint mb-5">
              Nothing here yet — build your first lineup and it'll show up once it's live on Spotify.
            </p>
            <Link
              href="/lineup"
              className="inline-block bg-grad text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all duration-150 hover:brightness-[1.05] active:scale-[0.96]"
            >
              Build your lineup
            </Link>
          </div>
        )}

        {events.map((e, i) => (
          <div
            key={e.id + e.createdAt}
            ref={setItemRef(i)}
            className={
              "flex items-start gap-3 bg-surface border border-line rounded-2xl p-4 mb-3 animate-fade-slide-up transition-all duration-150 " +
              (dragIndex === i
                ? "opacity-50 scale-[0.98] bg-surfaceAlt"
                : overIndex === i && dragIndex !== null
                ? "border-teal"
                : "opacity-100 scale-100")
            }
            style={{ animationDelay: `${i * 30}ms` }}
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
                      className="text-[11px] font-bold text-teal transition-transform duration-150 active:scale-90"
                    >
                      Build again
                    </button>
                  )}
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-muted flex items-center gap-1 transition-transform duration-150 active:scale-90"
                  >
                    Open
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
