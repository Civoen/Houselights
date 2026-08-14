const KEY = "houselights_pages_seen_v1";

function getSeenRoutes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function hasSeenPage(route: string): boolean {
  return getSeenRoutes().includes(route);
}

export function markPageSeen(route: string) {
  if (typeof window === "undefined") return;
  const seen = getSeenRoutes();
  if (seen.includes(route)) return;
  localStorage.setItem(KEY, JSON.stringify([...seen, route]));
}
