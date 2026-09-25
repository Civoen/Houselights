// Shared duration formatting — used anywhere a track-time total needs to
// read as "3h 12m" rather than a raw minute count.
export function fmtMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// eventDate comes from a <input type="date"> value, e.g. "2026-06-15".
// Parsed via explicit year/month/day components (not `new Date(string)`,
// which reads that format as UTC midnight and can land on the previous
// day once converted to a negative-offset local time) so the displayed
// date always matches what the user actually picked. Shared by the
// default-playlist-naming logic and the cover generator's date stat, so
// both read the event's date the same way rather than drifting apart.
export function formatEventDateShort(eventDate: string | undefined): string | null {
  if (!eventDate) return null;
  const [year, month, day] = eventDate.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
