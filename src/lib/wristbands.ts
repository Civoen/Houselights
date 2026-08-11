import { PastEvent } from "./types";

export type WristbandIconKey = "play" | "five" | "calendar" | "crown" | "flag" | "tickets";
export type WristbandPattern = "waves" | "dots" | "stars";

export interface WristbandDef {
  id: string;
  name: string;
  // Shown on the card while it's still locked.
  requirement: string;
  icon: WristbandIconKey;
  // Deliberately vivid and distinct per wristband — these are meant to
  // stand apart from the rest of the app's single-gradient look, the same
  // way real event wristbands are colorful and different from each other.
  color: string;
  pattern: WristbandPattern;
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

// Edit names, requirement copy, colors, or the unlock condition here — this
// is the only file that needs to change to add, rename, or retune a
// wristband. Order here is the display order on the Wristbands page.
export const WRISTBANDS: WristbandDef[] = [
  {
    id: "first-lineup",
    name: "First lineup",
    requirement: "Build your first playlist",
    icon: "play",
    color: "#8B5CF6",
    pattern: "waves",
    evaluate: (all) => nthByCreated(all, 1)?.createdAt ?? null,
  },
  {
    id: "regular",
    name: "Regular",
    requirement: "5 playlists created",
    icon: "five",
    color: "#F2A93C",
    pattern: "dots",
    evaluate: (all) => nthByCreated(all, 5)?.createdAt ?? null,
  },
  {
    id: "show-day",
    name: "Show day",
    requirement: "A show date passes",
    icon: "calendar",
    color: "#4361EE",
    pattern: "stars",
    evaluate: (_all, past) => nthByEventDate(past, 1)?.eventDate ?? null,
  },
  {
    id: "headliner",
    name: "Headliner",
    requirement: "5+ artists, one lineup",
    icon: "crown",
    color: "#E5484D",
    pattern: "stars",
    evaluate: (all) => earliestWhere(all, (e) => e.artistNames.length >= 5)?.createdAt ?? null,
  },
  {
    id: "marathon",
    name: "Marathon",
    requirement: "4h+ in one playlist",
    icon: "flag",
    color: "#FB7A3C",
    pattern: "waves",
    evaluate: (all) => earliestWhere(all, (e) => e.totalMinutes >= 240)?.createdAt ?? null,
  },
  {
    id: "season-pass",
    name: "Season pass",
    requirement: "3 shows attended",
    icon: "tickets",
    color: "#D6408F",
    pattern: "dots",
    evaluate: (_all, past) => nthByEventDate(past, 3)?.eventDate ?? null,
  },
];
