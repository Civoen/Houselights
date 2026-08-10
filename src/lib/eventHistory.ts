import { PastEvent } from "./types";

const KEY = "houselights_events_v1";

// Every playlist ever created, newest first. Despite the on-disk key name
// (kept for backwards compatibility with existing localStorage data), this
// is the full playlist history, not just ones tied to a past event date.
export function getAllEvents(): PastEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addEvent(event: PastEvent) {
  if (typeof window === "undefined") return;
  const events = getAllEvents();
  const next = [event, ...events].slice(0, 50);
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function saveAllEvents(events: PastEvent[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(events));
}

export function getUpcomingEvents(): PastEvent[] {
  const events = getAllEvents();
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.eventDate && e.eventDate >= todayStr && e.headliner?.name);
  upcoming.sort((a, b) => (a.eventDate! < b.eventDate! ? -1 : 1));
  return upcoming;
}

export function getUpcomingEvent(): PastEvent | null {
  return getUpcomingEvents()[0] || null;
}

// Events with a date that's already passed — the collapsed "Previous
// events" section on the Playlists page, not the full playlist list.
export function getPastDatedEvents(): PastEvent[] {
  const events = getAllEvents();
  const todayStr = new Date().toISOString().slice(0, 10);
  const past = events.filter((e) => e.eventDate && e.eventDate < todayStr && e.headliner?.name);
  past.sort((a, b) => (a.eventDate! > b.eventDate! ? -1 : 1));
  return past;
}
