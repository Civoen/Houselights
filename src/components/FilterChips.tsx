"use client";
import { FilterType } from "@/lib/types";
import { copy } from "@/lib/copy";

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
            onClick={() => onToggle(opt.id)}
            className={
              "flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all duration-150 active:scale-95 " +
              (active
                ? "bg-grad text-white"
                : "bg-surfaceAlt text-muted border border-line hover:border-accent hover:text-accent")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
