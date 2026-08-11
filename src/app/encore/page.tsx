"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllEvents } from "@/lib/eventHistory";
import { PastEvent } from "@/lib/types";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { fmtMinutes } from "@/lib/format";
import { SettingsButton } from "@/components/SettingsButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { copy } from "@/lib/copy";

export default function EncorePage() {
  const router = useRouter();
  const [events, setEvents] = useState<PastEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEvents(getAllEvents());
    setLoaded(true);
  }, []);

  const totalShows = events.length;
  const totalSongs = events.reduce((s, e) => s + e.trackCount, 0);
  const totalMinutes = events.reduce((s, e) => s + e.totalMinutes, 0);
  const todayStr = new Date().toISOString().slice(0, 10);
  const showsAttended = events.filter((e) => e.eventDate && e.eventDate < todayStr).length;

  // Most-featured headliner, not just any artist appearance — a headliner
  // is a deliberate choice each time, so it's a more meaningful "who do
  // you keep coming back to" signal than counting every opener too.
  const headlinerCounts = new Map<string, { count: number; image?: string }>();
  events.forEach((e) => {
    if (!e.headliner?.name) return;
    const existing = headlinerCounts.get(e.headliner.name);
    headlinerCounts.set(e.headliner.name, { count: (existing?.count || 0) + 1, image: e.headliner.image });
  });
  let topArtist: { name: string; count: number; image?: string } | null = null;
  headlinerCounts.forEach((v, name) => {
    if (!topArtist || v.count > topArtist.count) topArtist = { name, count: v.count, image: v.image };
  });

  const longestPlaylist = [...events].sort((a, b) => b.totalMinutes - a.totalMinutes)[0] || null;
  const firstShow = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0] || null;

  return (
    <main className="min-h-screen pb-28 animate-fade-slide-up">
      <div className="px-6 pb-2 pt-[calc(env(safe-area-inset-top)+1.5rem)] max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.back()}
              className="w-11 h-11 -ml-2 rounded-full bg-surfaceAlt text-muted text-xl flex items-center justify-center transition-transform duration-150 active:scale-90"
            >
              ‹
            </button>
            <h1 className="font-display text-3xl font-bold tracking-tight">{copy.encore.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="w-9 h-9 rounded-full bg-surfaceAlt text-muted" />
            <SettingsButton className="w-9 h-9 rounded-full bg-surfaceAlt text-muted" />
          </div>
        </div>
        <p className="text-sm text-muted font-medium">{copy.encore.subtitle}</p>
      </div>

      {loaded && totalShows === 0 && (
        <div className="px-6 py-14 max-w-lg mx-auto text-center">
          <p className="text-sm text-faint">{copy.encore.emptyMessage}</p>
        </div>
      )}

      {loaded && totalShows > 0 && (
        <div className="px-6 py-4 max-w-lg mx-auto">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-surface rounded-2xl p-4 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] animate-fade-slide-up">
              <div className="text-2xl font-extrabold">{totalShows}</div>
              <div className="text-xs text-faint font-semibold mt-0.5">{copy.encore.showsPrepped}</div>
            </div>
            <div className="bg-surface rounded-2xl p-4 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] animate-fade-slide-up" style={{ animationDelay: "30ms" }}>
              <div className="text-2xl font-extrabold">{showsAttended}</div>
              <div className="text-xs text-faint font-semibold mt-0.5">{copy.encore.showsAttended}</div>
            </div>
            <div className="bg-surface rounded-2xl p-4 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] animate-fade-slide-up" style={{ animationDelay: "60ms" }}>
              <div className="text-2xl font-extrabold">{totalSongs}</div>
              <div className="text-xs text-faint font-semibold mt-0.5">{copy.encore.songsQueued}</div>
            </div>
            <div className="bg-surface rounded-2xl p-4 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] animate-fade-slide-up" style={{ animationDelay: "90ms" }}>
              <div className="text-2xl font-extrabold">{fmtMinutes(totalMinutes)}</div>
              <div className="text-xs text-faint font-semibold mt-0.5">{copy.encore.timeQueued}</div>
            </div>
          </div>

          {topArtist && (
            <div
              className="bg-surface rounded-2xl p-4 mb-3 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] flex items-center gap-3 animate-fade-slide-up"
              style={{ animationDelay: "120ms" }}
            >
              <ArtistAvatar src={(topArtist as { image?: string }).image} size={44} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-wide text-faint">{copy.encore.topArtistLabel}</div>
                <div className="text-sm font-bold truncate">{(topArtist as { name: string }).name}</div>
                <div className="text-xs text-muted font-semibold">
                  {(topArtist as { count: number }).count} {(topArtist as { count: number }).count === 1 ? copy.encore.timeSuffix : copy.encore.timesSuffix}
                </div>
              </div>
            </div>
          )}

          {longestPlaylist && (
            <div
              className="bg-surface rounded-2xl p-4 mb-3 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] flex items-center gap-3 animate-fade-slide-up"
              style={{ animationDelay: "150ms" }}
            >
              <ArtistAvatar src={longestPlaylist.headliner?.image} size={44} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-wide text-faint">{copy.encore.longestLabel}</div>
                <div className="text-sm font-bold truncate">{longestPlaylist.name}</div>
                <div className="text-xs text-muted font-semibold">
                  {longestPlaylist.trackCount} {copy.encore.tracksSuffix} · {fmtMinutes(longestPlaylist.totalMinutes)}
                </div>
              </div>
            </div>
          )}

          {firstShow && (
            <div
              className="bg-surface rounded-2xl p-4 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] flex items-center gap-3 animate-fade-slide-up"
              style={{ animationDelay: "180ms" }}
            >
              <ArtistAvatar src={firstShow.headliner?.image} size={44} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-wide text-faint">{copy.encore.firstLabel}</div>
                <div className="text-sm font-bold truncate">{firstShow.name}</div>
                <div className="text-xs text-muted font-semibold">
                  {new Date(firstShow.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
