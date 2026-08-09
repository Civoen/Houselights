"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getUpcomingEvents } from "@/lib/eventHistory";
import { PastEvent } from "@/lib/types";
import { copy } from "@/lib/copy";
import { BrandMark } from "@/components/BrandMark";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { SettingsButton } from "@/components/SettingsButton";
import { ThemeToggle } from "@/components/ThemeToggle";

function formatCountdown(days: number) {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function daysUntil(dateStr: string) {
  return Math.round(
    (new Date(dateStr + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime()) / 86400000
  );
}

export default function Home() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [upcoming, setUpcoming] = useState<PastEvent[]>([]);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => setConnected(!!d.connected))
      .catch(() => setConnected(false));
    setUpcoming(getUpcomingEvents());
  }, []);

  if (!connected) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 pb-16 relative">
        <div className="absolute top-6 right-6 flex items-center gap-2">
          <ThemeToggle className="w-9 h-9 rounded-full bg-surfaceAlt text-muted" />
          <SettingsButton className="w-9 h-9 rounded-full bg-surfaceAlt text-muted" />
        </div>
        <div className="max-w-sm w-full text-center animate-fade-slide-up">
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center animate-lights-up">
            <BrandMark size={56} />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">Houselights</h1>
          <p className="text-muted text-sm mb-8">{copy.home.tagline}</p>
          <a
            href="/api/auth/login"
            className="inline-block w-full bg-grad text-white py-4 rounded-2xl font-extrabold text-sm transition-all duration-150 hover:brightness-[1.05] hover:scale-[1.02] active:scale-[0.97]"
          >
            {copy.home.ctaConnect}
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24 animate-fade-slide-up">
      <div className="bg-grad text-white px-6 pt-10 pb-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">{copy.nextUp.title}</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle className="w-8 h-8 rounded-full bg-white/20 text-white" />
            <SettingsButton className="w-8 h-8 rounded-full bg-white/20 text-white" />
          </div>
        </div>
        <p className="text-sm opacity-90 mt-1">
          {upcoming.length > 0
            ? `${upcoming.length} show${upcoming.length === 1 ? "" : "s"} ${copy.nextUp.subtitleSuffix}`
            : copy.nextUp.subtitleEmpty}
        </p>
      </div>

      <div className="px-6 py-5 max-w-lg mx-auto">
        {upcoming.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-sm text-faint mb-5">{copy.nextUp.emptyMessage}</p>
            <Link
              href="/lineup"
              className="inline-block bg-grad text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all duration-150 hover:brightness-[1.05] active:scale-[0.96]"
            >
              {copy.nextUp.buildLineupLink}
            </Link>
          </div>
        ) : (
          upcoming.map((e, i) => (
            <a
              key={e.id + e.createdAt}
              href={e.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 py-3 border-b border-line animate-fade-slide-up transition-transform duration-150 active:scale-[0.99]"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <ArtistAvatar src={e.headliner?.image} size={40} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{e.headliner?.name || e.name}</div>
                <div className="text-xs text-faint truncate">{e.artistNames.join(", ")}</div>
              </div>
              <span className="text-xs font-bold text-muted flex-shrink-0">
                {formatCountdown(daysUntil(e.eventDate!))}
              </span>
            </a>
          ))
        )}
      </div>
    </main>
  );
}
