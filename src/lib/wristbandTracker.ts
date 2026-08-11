import { WRISTBANDS, WristbandDef } from "./wristbands";
import { getAllEvents, getPastDatedEvents } from "./eventHistory";

const SEEN_KEY = "houselights_wristbands_seen_v1";

function getSeenIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSeenIds(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
}

export function getUnlockedWristbands(): { def: WristbandDef; earnedOn: string }[] {
  const all = getAllEvents();
  const past = getPastDatedEvents();
  const unlocked: { def: WristbandDef; earnedOn: string }[] = [];
  WRISTBANDS.forEach((def) => {
    const earnedOn = def.evaluate(all, past);
    if (earnedOn) unlocked.push({ def, earnedOn });
  });
  return unlocked;
}

// Compares currently-unlocked wristbands against what's already been shown,
// marks anything newly true as seen right away (so a pop-up never repeats
// for the same wristband), and returns just the newly-crossed ones.
//
// On the very first run on a device — i.e. this feature shipping onto an
// account that already has playlist history — whatever's already true gets
// marked seen silently instead of surfacing a burst of pop-ups for
// milestones that were actually crossed a while ago.
export function checkForNewWristbands(): WristbandDef[] {
  const unlocked = getUnlockedWristbands();
  const alreadyInitialized = typeof window !== "undefined" && localStorage.getItem(SEEN_KEY) !== null;

  if (!alreadyInitialized) {
    saveSeenIds(unlocked.map((u) => u.def.id));
    return [];
  }

  const seen = new Set(getSeenIds());
  const fresh = unlocked.filter((u) => !seen.has(u.def.id));
  if (fresh.length > 0) {
    saveSeenIds([...seen, ...fresh.map((f) => f.def.id)]);
  }
  return fresh.map((f) => f.def);
}

// Used by Settings' "Clear progress" — wipes the unlock-tracking record so
// every wristband re-locks (they're evaluated live from playlist history,
// so once that's also cleared they'll naturally show as locked; this
// specifically clears the separate "what's already been shown" record so
// a future re-unlock pops the toast again instead of staying silent).
export function resetWristbandProgress() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SEEN_KEY);
}
