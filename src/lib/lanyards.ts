import { PastEvent } from "./types";

export type LanyardIcon = "play" | "five" | "calendar" | "crown" | "flag" | "tickets";

export interface LanyardDef {
  id: string;
  name: string;
  // Shown on the card while it's still locked.
  requirement: string;
  icon: LanyardIcon;
  // Returns the date it was earned (as an ISO-ish string, used for display
  // and sorting) if the condition is currently met, or null if it isn't.
  // `all` is every playlist ever created; `past` is the subset whose event
  // date has already passed.
  evaluate: (all: PastEvent[], past: PastEvent[]) => string | null;
}

function earliestByCreated(events: PastEvent[]): PastEvent | undefined {
  return [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
}

function nthByCreated(events: PastEvent[], n: number): PastEvent | undefined {
  return [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[n - 1];
}

function nthByEventDate(events: PastEvent[], n: number): PastEvent | undefined {
  return [...events].sort((a, b) => (a.eventDate || "").localeCompare(b.eventDate || ""))[n - 1];
}

function earliestWhere(events: PastEvent[], predicate: (e: PastEvent) => boolean): PastEvent | undefined {
  return earliestByCreated(events.filter(predicate));
}

// Edit names, requirement copy, or the unlock condition here — this is the
// only file that needs to change to add, rename, or retune a lanyard. Order
// here is the display order on the Lanyards page.
export const LANYARDS: LanyardDef[] = [
  {
    id: "first-lineup",
    name: "First lineup",
    requirement: "Build your first playlist",
    icon: "play",
    evaluate: (all) => nthByCreated(all, 1)?.createdAt ?? null,
  },
  {
    id: "regular",
    name: "Regular",
    requirement: "5 playlists created",
    icon: "five",
    evaluate: (all) => nthByCreated(all, 5)?.createdAt ?? null,
  },
  {
    id: "show-day",
    name: "Show day",
    requirement: "A show date passes",
    icon: "calendar",
    evaluate: (_all, past) => nthByEventDate(past, 1)?.eventDate ?? null,
  },
  {
    id: "headliner",
    name: "Headliner",
    requirement: "5+ artists, one lineup",
    icon: "crown",
    evaluate: (all) => earliestWhere(all, (e) => e.artistNames.length >= 5)?.createdAt ?? null,
  },
  {
    id: "marathon",
    name: "Marathon",
    requirement: "4h+ in one playlist",
    icon: "flag",
    evaluate: (all) => earliestWhere(all, (e) => e.totalMinutes >= 240)?.createdAt ?? null,
  },
  {
    id: "season-pass",
    name: "Season pass",
    requirement: "3 shows attended",
    icon: "tickets",
    evaluate: (_all, past) => nthByEventDate(past, 3)?.eventDate ?? null,
  },
];
