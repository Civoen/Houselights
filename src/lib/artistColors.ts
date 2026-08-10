import { LineupArtist } from "./types";

// Shared rotating palette for per-artist accent colors — used on the New
// Event page (distribution bar, avatar dot, card border) and on the
// Preview page (grouped song boxes), so the same artist always reads as
// the same color across both. Kept in one place rather than duplicated so
// they can't quietly drift apart from each other.
export const ARTIST_COLORS = ["#14CC9B", "#4FA8E8", "#F5A623", "#EF6461", "#6C63FF", "#2FB8C6", "#E14D9F", "#8BC34A"];

export function colorForArtistIndex(index: number): string {
  return ARTIST_COLORS[index % ARTIST_COLORS.length];
}

// Maps each artist's id to their color, based on their position in the
// lineup — the same ordering the New Event page uses to assign colors.
export function buildArtistColorMap(lineup: LineupArtist[]): Record<string, string> {
  const map: Record<string, string> = {};
  lineup.forEach((entry, i) => {
    map[entry.artist.id] = colorForArtistIndex(i);
  });
  return map;
}
