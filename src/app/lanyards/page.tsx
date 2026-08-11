"use client";
import { useEffect, useState } from "react";
import { LANYARDS } from "@/lib/lanyards";
import { getUnlockedLanyards } from "@/lib/lanyardTracker";
import { LanyardIcon } from "@/components/LanyardIcon";
import { SettingsButton } from "@/components/SettingsButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { copy } from "@/lib/copy";

function formatEarnedDate(dateStr: string) {
  // evaluate() returns either a full createdAt ISO timestamp or a plain
  // eventDate (YYYY-MM-DD) — both parse fine here, we just want the date.
  return new Date(dateStr).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function LanyardsPage() {
  const [unlockedIds, setUnlockedIds] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unlocked = getUnlockedLanyards();
    const map: Record<string, string> = {};
    unlocked.forEach((u) => {
      map[u.def.id] = u.earnedOn;
    });
    setUnlockedIds(map);
    setLoaded(true);
  }, []);

  const earnedCount = Object.keys(unlockedIds).length;

  // Unlocked first, locked after — within each group the original config
  // order is preserved (Array.prototype.sort is stable).
  const sortedLanyards = [...LANYARDS].sort((a, b) => {
    const aUnlocked = !!unlockedIds[a.id];
    const bUnlocked = !!unlockedIds[b.id];
    if (aUnlocked === bUnlocked) return 0;
    return aUnlocked ? -1 : 1;
  });

  return (
    <main className="min-h-screen pb-28 animate-fade-slide-up">
      <div className="px-6 pb-2 pt-[calc(env(safe-area-inset-top)+1.5rem)] max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-3xl font-bold tracking-tight">{copy.lanyards.title}</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle className="w-9 h-9 rounded-full bg-surfaceAlt text-muted" />
            <SettingsButton className="w-9 h-9 rounded-full bg-surfaceAlt text-muted" />
          </div>
        </div>
        <p className="text-sm text-muted font-medium">
          {earnedCount} of {LANYARDS.length} earned
        </p>
      </div>

      <div className="px-6 py-4 max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-3">
          {loaded &&
            sortedLanyards.map((lanyard, i) => {
              const earnedOn = unlockedIds[lanyard.id];
              const unlocked = !!earnedOn;
              return (
                <div
                  key={lanyard.id}
                  className="bg-surface rounded-2xl py-4 px-2 text-center shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] animate-fade-slide-up"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="flex justify-center">
                    <LanyardIcon icon={lanyard.icon} unlocked={unlocked} gradientId={`lanyard-${lanyard.id}`} />
                  </div>
                  <div className={"text-xs font-extrabold mt-2 " + (unlocked ? "" : "text-faint")}>{lanyard.name}</div>
                  <div className={"text-[10px] font-bold mt-0.5 " + (unlocked ? "text-green" : "text-faint")}>
                    {unlocked ? `Earned ${formatEarnedDate(earnedOn)}` : lanyard.requirement}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </main>
  );
}
