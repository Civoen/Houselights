import { PastEvent } from "./types";

const KEY = "houselights_events_v1";

export function getPastEvents(): PastEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addPastEvent(event: PastEvent) {
  if (typeof window === "undefined") return;
  const events = getPastEvents();
  const next = [event, ...events].slice(0, 50);
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function savePastEvents(events: PastEvent[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(events));
}

export function getUpcomingEvent(): PastEvent | null {
  const events = getPastEvents();
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.eventDate && e.eventDate >= todayStr && e.headliner?.name);
  if (upcoming.length === 0) return null;
  upcoming.sort((a, b) => (a.eventDate! < b.eventDate! ? -1 : 1));
  return upcoming[0];
}
