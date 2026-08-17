"use client";
import { FilterType } from "@/lib/types";
import { copy } from "@/lib/copy";
import { SegmentedControl } from "./SegmentedControl";

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

// Same sliding-pill visual language as the Time/Songs toggle
// (SegmentedControl) — this used to be its own separately-styled pair of
// buttons; now it's a thin wrapper that just supplies the per-artist
// gradient, so both toggles share one implementation (and one fix) rather
// than two visually-similar but structurally different controls.
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
    <SegmentedControl
      className="mb-3"
      value={value}
      onChange={(id) => onChange(id as FilterType)}
      activeGradient={gradient}
      options={[
        { id: "popular", label: copy.filters.popular },
        { id: "setlist", label: copy.filters.setlist },
      ]}
    />
  );
}
