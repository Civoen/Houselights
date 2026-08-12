"use client";
import { haptic, HAPTIC } from "@/lib/haptics";

interface Option {
  id: string;
  label: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className = "",
  accent = false,
}: {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  // Gradient pill (matching Time presets/Filter chips) instead of the
  // default plain raised-card look — opt-in since not every usage of this
  // component asked for it.
  accent?: boolean;
}) {
  const activeIndex = options.findIndex((o) => o.id === value);
  const segWidthPct = 100 / options.length;

  return (
    <div className={"relative flex bg-surfaceAlt rounded-xl p-1 " + className}>
      {activeIndex >= 0 && (
        <div
          className={
            "absolute top-1 bottom-1 rounded-lg " +
            (accent ? "bg-grad shadow-[0_2px_10px_-2px_rgba(17,80,103,0.45)]" : "bg-surface shadow-[0_2px_8px_-2px_rgba(10,31,38,0.18)]")
          }
          style={{
            left: `calc(${activeIndex * segWidthPct}% + 4px)`,
            width: `calc(${segWidthPct}% - 8px)`,
            transition: "left 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <div key={activeIndex} className="w-full h-full rounded-lg animate-pill-squeeze" />
        </div>
      )}
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => {
            haptic(HAPTIC.tap);
            onChange(opt.id);
          }}
          className={
            "relative z-10 flex-1 py-2 text-center text-xs font-bold transition-colors duration-300 " +
            (opt.id === value ? (accent ? "text-white" : "text-ink") : "text-muted")
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
