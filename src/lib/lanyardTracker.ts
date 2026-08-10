import { LANYARDS, LanyardDef } from "./lanyards";
import { getAllEvents, getPastDatedEvents } from "./eventHistory";

const SEEN_KEY = "houselights_lanyards_seen_v1";

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

export function getUnlockedLanyards(): { def: LanyardDef; earnedOn: string }[] {
  const all = getAllEvents();
  const past = getPastDatedEvents();
  const unlocked: { def: LanyardDef; earnedOn: string }[] = [];
  LANYARDS.forEach((def) => {
    const earnedOn = def.evaluate(all, past);
    if (earnedOn) unlocked.push({ def, earnedOn });
  });
  return unlocked;
}

// Compares currently-unlocked lanyards against what's already been shown,
// marks anything newly true as seen right away (so a pop-up never repeats
// for the same lanyard), and returns just the newly-crossed ones.
//
// On the very first run on a device — i.e. this feature shipping onto an
// account that already has playlist history — whatever's already true gets
// marked seen silently instead of surfacing a burst of pop-ups for
// milestones that were actually crossed a while ago.
export function checkForNewLanyards(): LanyardDef[] {
  const unlocked = getUnlockedLanyards();
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
