import { LineupArtist } from "./types";
import { ColorblindMode } from "./colorblindStore";

// Shared rotating palette for per-artist accent colors — used on the New
// Event page (distribution bar, avatar dot, card border) and on the
// Preview page (grouped song boxes), so the same artist always reads as
// the same color across both. Kept in one place rather than duplicated so
// they can't quietly drift apart from each other.
//
// Three palettes: the default, plus two colorblind-safe alternatives.
// "redGreen" is based on the Okabe-Ito palette (safe for both protanopia
// and deuteranopia, which together account for the vast majority of color
// vision deficiency) — it avoids red/green pairs and leans on blue,
// orange, and yellow instead. "blueYellow" is for the much rarer
// tritanopia, and instead avoids blue/yellow adjacency, leaning on red,
// green, and magenta hues that stay distinct for that specific deficiency.
const PALETTES: Record<ColorblindMode, string[]> = {
  off: ["#14CC9B", "#4FA8E8", "#F5A623", "#EF6461", "#6C63FF", "#2FB8C6", "#E14D9F", "#8BC34A"],
  redGreen: ["#0072B2", "#E69F00", "#56B4E9", "#F0E442", "#009E73", "#CC79A7", "#D55E00", "#999999"],
  blueYellow: ["#E64980", "#FA5252", "#40C057", "#BE4BDB", "#FF922B", "#12B886", "#F06595", "#495057"],
};

export function getArtistColors(mode: ColorblindMode = "off"): string[] {
  return PALETTES[mode];
}

export function colorForArtistIndex(index: number, mode: ColorblindMode = "off"): string {
  const palette = PALETTES[mode];
  return palette[index % palette.length];
}

// Maps each artist's id to their color, based on their position in the
// lineup — the same ordering the New Event page uses to assign colors.
export function buildArtistColorMap(lineup: LineupArtist[], mode: ColorblindMode = "off"): Record<string, string> {
  const palette = PALETTES[mode];
  const map: Record<string, string> = {};
  lineup.forEach((entry, i) => {
    map[entry.artist.id] = palette[i % palette.length];
  });
  return map;
}
