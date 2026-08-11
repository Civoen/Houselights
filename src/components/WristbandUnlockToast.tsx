"use client";
import { WristbandIcon } from "./WristbandIcon";
import { WristbandDef } from "@/lib/wristbands";

export function WristbandUnlockToast({ wristband, onClick }: { wristband: WristbandDef; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed left-6 right-6 top-[calc(env(safe-area-inset-top)+12px)] z-50 max-w-lg mx-auto animate-fade-slide-up"
    >
      <div className="bg-navy text-white rounded-2xl pl-3 pr-4 py-2.5 shadow-xl flex items-center gap-3 text-left">
        <div className="flex-shrink-0">
          <WristbandIcon
            icon={wristband.icon}
            unlocked
            color={wristband.color}
            pattern={wristband.pattern}
            gradientId={`toast-${wristband.id}`}
            width={44}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-green">Wristband unlocked</div>
          <div className="text-sm font-bold truncate">{wristband.name}</div>
        </div>
        <span className="text-[11px] font-bold text-green flex-shrink-0">View</span>
      </div>
    </button>
  );
}
