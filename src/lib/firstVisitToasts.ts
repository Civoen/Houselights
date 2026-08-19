const KEY = "houselights_first_visit_seen_v1";

export type FirstVisitPage = "newEvent" | "preview" | "playlists" | "wristbands" | "stats";

function getSeenPages(): FirstVisitPage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function hasSeenFirstVisit(page: FirstVisitPage): boolean {
  return getSeenPages().includes(page);
}

export function markFirstVisitSeen(page: FirstVisitPage) {
  if (typeof window === "undefined") return;
  const seen = getSeenPages();
  if (seen.includes(page)) return;
  localStorage.setItem(KEY, JSON.stringify([...seen, page]));
}
