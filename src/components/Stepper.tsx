"use client";
import { copy } from "@/lib/copy";

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 100,
  step = 1,
  accent = false,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  // Matches the brand-gradient look the Time presets use for their
  // selected value — opt-in rather than the default, since this
  // component is also used for the smaller per-artist Share weight
  // control, where a gradient pill repeated down a list of cards would
  // feel loud rather than matching one prominent selector.
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={copy.lineup.decreaseLabel}
        onClick={() => onChange(Math.max(min, value - step))}
        className={
          "rounded-lg border border-lineStrong bg-surfaceAlt text-muted text-sm font-bold flex items-center justify-center transition-transform duration-100 active:scale-90 hover:border-accent hover:text-accent " +
          (accent ? "w-7 h-7" : "w-6 h-6")
        }
      >
        −
      </button>
      <span
        key={value}
        className={
          "text-center font-display text-sm font-bold animate-pop-in rounded-lg " +
          (accent ? "min-w-[2.75rem] py-1 px-2 font-extrabold text-white bg-grad shadow-[0_6px_16px_-6px_rgba(17,80,103,0.55)]" : "min-w-[1.75rem]")
        }
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={copy.lineup.increaseLabel}
        onClick={() => onChange(Math.min(max, value + step))}
        className={
          "rounded-lg border border-lineStrong bg-surfaceAlt text-muted text-sm font-bold flex items-center justify-center transition-transform duration-100 active:scale-90 hover:border-accent hover:text-accent " +
          (accent ? "w-7 h-7" : "w-6 h-6")
        }
      >
        +
      </button>
    </div>
  );
}
