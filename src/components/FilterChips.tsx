"use client";
import { FilterType } from "@/lib/types";
import { copy } from "@/lib/copy";
import { haptic, HAPTIC } from "@/lib/haptics";

const OPTIONS: { id: FilterType; label: string }[] = [
  { id: "popular", label: copy.filters.popular },
  { id: "recent", label: copy.filters.recent },
  { id: "deep", label: copy.filters.deep },
];

export function FilterChips({ value, onToggle }: { value: FilterType[]; onToggle: (f: FilterType) => void }) {
  return (
    <div className="flex gap-2 mb-3">
      {OPTIONS.map((opt) => {
        const active = value.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => {
              haptic(HAPTIC.tap);
              onToggle(opt.id);
            }}
            className={
              "flex-1 text-center py-2 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 " +
              (active
                ? "bg-grad text-white shadow-[0_6px_16px_-6px_rgba(17,80,103,0.55)]"
                : "bg-surfaceAlt text-muted hover:text-accent")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
