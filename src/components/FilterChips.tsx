"use client";
import { FilterType } from "@/lib/types";
import { copy } from "@/lib/copy";
import { haptic, HAPTIC } from "@/lib/haptics";

const OPTIONS: { id: FilterType; label: string }[] = [
  { id: "popular", label: copy.filters.popular },
  { id: "setlist", label: copy.filters.setlist },
];

// Darkens a hex color toward black by the given amount (0-1) — used to
// build a two-stop gradient from a single artist accent color, matching
// the app's own dark-to-bright gradient direction rather than a flat fill.
function darken(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amount));
  const g = Math.round(((n >> 8) & 255) * (1 - amount));
  const b = Math.round((n & 255) * (1 - amount));
  return `rgb(${r},${g},${b})`;
}

export function FilterChips({
  value,
  onChange,
  artistColor,
}: {
  value: FilterType;
  onChange: (f: FilterType) => void;
  artistColor: string;
}) {
  const gradient = `linear-gradient(115deg, ${darken(artistColor, 0.35)}, ${artistColor})`;

  return (
    <div className="flex gap-2 mb-3">
      {OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (active) return;
              haptic(HAPTIC.tap);
              onChange(opt.id);
            }}
            style={active ? { backgroundImage: gradient } : undefined}
            className={
              "flex-1 text-center py-2 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 " +
              (active ? "text-white shadow-[0_6px_16px_-6px_rgba(17,80,103,0.55)]" : "bg-surfaceAlt text-muted hover:text-accent")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
