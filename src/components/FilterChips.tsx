"use client";
import { FilterType } from "@/lib/types";

const OPTIONS: { id: FilterType; label: string }[] = [
  { id: "popular", label: "Most popular" },
  { id: "recent", label: "Recent" },
  { id: "deep", label: "Deep cuts" },
];

export function FilterChips({ value, onChange }: { value: FilterType; onChange: (f: FilterType) => void }) {
  return (
    <div className="flex gap-2 mb-3">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={
            "flex-1 text-center py-2 rounded-lg text-xs font-bold border " +
            (value === opt.id
              ? "bg-grad text-white border-transparent"
              : "bg-surfaceAlt text-muted border-line")
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
