"use client";
import { WristbandIcon } from "./WristbandIcon";
import { WristbandDef } from "@/lib/wristbands";
import { copy } from "@/lib/copy";

// Small burst of colored particles radiating from behind the icon — each
// one animates to its own translate endpoint (set via a CSS variable) so
// a single shared keyframe can send them in different directions rather
// than needing a separate keyframe per particle.
const PARTICLES = [
  { x: -34, y: -22, color: "#F5A623", delay: 0 },
  { x: 30, y: -28, color: "#14CC9B", delay: 30 },
  { x: -40, y: 10, color: "#4FA8E8", delay: 60 },
  { x: 38, y: 6, color: "#E14D9F", delay: 15 },
  { x: -18, y: -38, color: "#8BC34A", delay: 90 },
  { x: 18, y: -40, color: "#F5A623", delay: 45 },
  { x: -30, y: 32, color: "#4FA8E8", delay: 75 },
  { x: 32, y: 30, color: "#14CC9B", delay: 105 },
];

export function WristbandUnlockToast({ wristband, color, onClick }: { wristband: WristbandDef; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed left-6 right-6 top-[calc(env(safe-area-inset-top)+12px)] z-50 max-w-lg mx-auto animate-ring-pop"
    >
      <div className="bg-navy text-white rounded-2xl pl-3 pr-4 py-2.5 shadow-xl flex items-center gap-3 text-left">
        <div className="relative flex-shrink-0">
          <div
            className="absolute inset-0 rounded-full blur-md opacity-70 animate-pulse"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full animate-confetti-burst pointer-events-none"
              style={
                {
                  backgroundColor: p.color,
                  animationDelay: `${p.delay}ms`,
                  "--burst-transform": `translate(${p.x}px, ${p.y}px) scale(0)`,
                } as React.CSSProperties
              }
              aria-hidden="true"
            />
          ))}
          <div className="relative">
            <WristbandIcon
              icon={wristband.icon}
              unlocked
              color={color}
              pattern={wristband.pattern}
              gradientId={`toast-${wristband.id}`}
              width={44}
            />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-green">{copy.wristbands.unlockedToastLabel}</div>
          <div className="text-sm font-bold truncate">{wristband.name}</div>
        </div>
        <span className="text-[11px] font-bold text-green flex-shrink-0">{copy.wristbands.viewAction}</span>
      </div>
    </button>
  );
}
