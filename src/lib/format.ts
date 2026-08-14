// Shared duration formatting — used anywhere a track-time total needs to
// read as "3h 12m" rather than a raw minute count.
export function fmtMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
