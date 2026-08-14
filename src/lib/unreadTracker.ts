import { getAllEvents } from "./eventHistory";
import { getAllDrafts } from "./drafts";
import { getUnlockedWristbands } from "./wristbandTracker";

const PLAYLISTS_SEEN_KEY = "houselights_playlists_seen_count_v1";
const WRISTBANDS_SEEN_KEY = "houselights_wristbands_seen_count_v1";

function getStoredCount(key: string): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(key);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

function setStoredCount(key: string, count: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, String(count));
}

function currentPlaylistsCount(): number {
  return getAllEvents().length + getAllDrafts().length;
}

export function hasUnreadPlaylists(): boolean {
  return currentPlaylistsCount() > getStoredCount(PLAYLISTS_SEEN_KEY);
}

export function markPlaylistsSeen() {
  setStoredCount(PLAYLISTS_SEEN_KEY, currentPlaylistsCount());
}

export function hasUnreadWristbands(): boolean {
  return getUnlockedWristbands().length > getStoredCount(WRISTBANDS_SEEN_KEY);
}

export function markWristbandsSeen() {
  setStoredCount(WRISTBANDS_SEEN_KEY, getUnlockedWristbands().length);
}
