import { WRISTBANDS, WristbandDef } from "./wristbands";
import { getAllEvents, getPastDatedEvents } from "./eventHistory";

const SEEN_KEY = "houselights_wristbands_seen_v1";
// Wristbands were previously evaluated live against current playlist
// history on every check — meaning deleting the one playlist that had
// satisfied a condition (5+ artists, 4h+, etc.) would silently re-lock a
// wristband the user had genuinely already earned. This record latches
// each wristband permanently the first time it's ever true, so earning
// something is a one-way door regardless of what happens to the
// underlying data afterward.
const EARNED_KEY = "houselights_wristbands_earned_v1";

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

function getEarnedRecord(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(EARNED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveEarnedRecord(record: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(EARNED_KEY, JSON.stringify(record));
}

export function getUnlockedWristbands(): { def: WristbandDef; earnedOn: string }[] {
  const all = getAllEvents();
  const past = getPastDatedEvents();
  const earnedRecord = getEarnedRecord();
  let recordChanged = false;
  const unlocked: { def: WristbandDef; earnedOn: string }[] = [];

  WRISTBANDS.forEach((def) => {
    const alreadyEarned = earnedRecord[def.id];
    if (alreadyEarned) {
      // Already permanently latched — skip live evaluation entirely, so
      // this can never be affected by data changing afterward.
      unlocked.push({ def, earnedOn: alreadyEarned });
      return;
    }
    const earnedOn = def.evaluate(all, past);
    if (earnedOn) {
      unlocked.push({ def, earnedOn });
      earnedRecord[def.id] = earnedOn;
      recordChanged = true;
    }
  });

  if (recordChanged) saveEarnedRecord(earnedRecord);
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

// Used by Settings' "Clear progress" — wipes both the "what's already been
// shown" record and the permanent earned-record latch, so every wristband
// genuinely re-locks (rather than the earned latch silently keeping them
// unlocked despite Clear progress's own promise to reset everything).
export function resetWristbandProgress() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SEEN_KEY);
  localStorage.removeItem(EARNED_KEY);
}

// Used by AppChrome — the only place that actually owns the unlock-toast
// queue — but the moment a wristband is genuinely earned (e.g. right after
// a successful playlist create/save) happens in a different component
// entirely. Rather than lifting the whole toast queue into a new shared
// Context just for this one signal, a plain custom event lets any
// component ask AppChrome to check again immediately, on top of its
// existing mount/visibilitychange triggers.
export const WRISTBAND_CHECK_EVENT = "houselights:wristband-check";

export function triggerWristbandCheck() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WRISTBAND_CHECK_EVENT));
}
