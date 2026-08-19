import { getAllEvents } from "./eventHistory";
import { getAllDrafts } from "./drafts";
import { dispatchPlaylistsChanged } from "./playlistsChangedEvent";
export { PLAYLISTS_CHANGED_EVENT } from "./playlistsChangedEvent";

const KEY = "houselights_playlists_ack_v1";

// Stores the createdAt of the newest event/draft the Playlists tab has
// actually been visited with in view — not a count, since a count can't
// tell "one new item" apart from "one item deleted, one item added" (both
// leave the total unchanged, but only one is genuinely nothing new).
function getAcknowledgedAt(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY) || "";
}

function latestCreatedAt(): string {
  const events = getAllEvents();
  const drafts = getAllDrafts();
  const all = [...events.map((e) => e.createdAt), ...drafts.map((d) => d.createdAt)];
  return all.sort().pop() || "";
}

export function hasUnseenPlaylists(): boolean {
  const latest = latestCreatedAt();
  if (!latest) return false;
  return latest > getAcknowledgedAt();
}

export function acknowledgePlaylistsSeen() {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, latestCreatedAt());
  dispatchPlaylistsChanged();
}
