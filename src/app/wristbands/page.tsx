"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { WRISTBANDS, WristbandDef, colorForWristband } from "@/lib/wristbands";
import { useColorblindMode } from "@/lib/colorblindStore";
import { getUnlockedWristbands } from "@/lib/wristbandTracker";
import { WristbandIcon } from "@/components/WristbandIcon";
import { copy } from "@/lib/copy";

function formatEarnedDate(dateStr: string) {
  // evaluate() returns either a full createdAt ISO timestamp or a plain
  // eventDate (YYYY-MM-DD) — both parse fine here, we just want the date.
  return new Date(dateStr).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function WristbandsPage() {
  const { mode: colorblindMode } = useColorblindMode();
  const [unlockedIds, setUnlockedIds] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<WristbandDef | null>(null);

  useEffect(() => {
    const unlocked = getUnlockedWristbands();
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
  const sortedWristbands = [...WRISTBANDS].sort((a, b) => {
    const aUnlocked = !!unlockedIds[a.id];
    const bUnlocked = !!unlockedIds[b.id];
    if (aUnlocked === bUnlocked) return 0;
    return aUnlocked ? -1 : 1;
  });

  const selectedEarnedOn = selected ? unlockedIds[selected.id] : undefined;
  const selectedUnlocked = !!selectedEarnedOn;

  return (
    <main className="min-h-screen pb-28 animate-fade-slide-up">
      <div className="px-6 pb-2 pt-[calc(env(safe-area-inset-top)+1.5rem)] max-w-lg mx-auto w-full">
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">{copy.wristbands.title}</h1>
        <p className="text-sm text-muted font-medium">
          {earnedCount} of {WRISTBANDS.length} earned
        </p>
      </div>

      <div className="px-6 py-4 max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-3">
          {loaded &&
            sortedWristbands.map((wristband, i) => {
              const earnedOn = unlockedIds[wristband.id];
              const unlocked = !!earnedOn;
              return (
                <button
                  key={wristband.id}
                  onClick={() => setSelected(wristband)}
                  className="bg-surface rounded-2xl py-4 px-2 text-center shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)] animate-fade-slide-up transition-transform duration-150 active:scale-95"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="flex justify-center">
                    <WristbandIcon
                      icon={wristband.icon}
                      unlocked={unlocked}
                      color={colorForWristband(wristband, colorblindMode)}
                      pattern={wristband.pattern}
                      gradientId={`wristband-${wristband.id}`}
                      width={108}
                    />
                  </div>
                  <div className={"text-xs font-extrabold mt-2 " + (unlocked ? "" : "text-faint")}>{wristband.name}</div>
                  <div className={"text-[10px] font-bold mt-0.5 " + (unlocked ? "text-muted" : "text-faint")}>
                    {wristband.requirement}
                  </div>
                  {unlocked && (
                    <div className="text-[10px] font-bold mt-0.5 text-green">{`${copy.common.earnedPrefix} ${formatEarnedDate(earnedOn)}`}</div>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {selected &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-bg flex flex-col items-center justify-center px-8 animate-fade-slide-up"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <button
              onClick={() => setSelected(null)}
              aria-label={copy.common.closeLabel}
              className="absolute top-[calc(env(safe-area-inset-top)+1.5rem)] right-6 w-11 h-11 rounded-xl bg-surfaceAlt text-muted text-xl flex items-center justify-center transition-transform duration-150 active:scale-90"
            >
              ✕
            </button>
            <WristbandIcon
              icon={selected.icon}
              unlocked={selectedUnlocked}
              color={colorForWristband(selected, colorblindMode)}
              pattern={selected.pattern}
              gradientId={`wristband-full-${selected.id}`}
              width={220}
            />
            <h2 className={"font-display text-2xl font-bold mt-6 text-center " + (selectedUnlocked ? "" : "text-faint")}>
              {selected.name}
            </h2>
            <p className={"text-sm font-semibold mt-2 text-center " + (selectedUnlocked ? "text-muted" : "text-faint")}>
              {selected.requirement}
            </p>
            {selectedUnlocked && (
              <p className="text-xs font-bold text-green mt-3">{`${copy.common.earnedPrefix} ${formatEarnedDate(selectedEarnedOn!)}`}</p>
            )}
          </div>,
          document.body
        )}
    </main>
  );
}
