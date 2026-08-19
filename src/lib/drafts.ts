import { DraftPlaylist } from "./types";
import { dispatchPlaylistsChanged } from "./playlistsChangedEvent";

const KEY = "houselights_drafts_v1";

// Drafts a guest built but hasn't (yet) logged in to actually send to
// Spotify — never counted toward Encore stats, Wristbands, or "You've
// seen them N times", since none of those are about intent, they're about
// playlists that genuinely exist. A draft is unfinished by definition.
export function getAllDrafts(): DraftPlaylist[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addDraft(draft: DraftPlaylist) {
  if (typeof window === "undefined") return;
  const drafts = getAllDrafts();
  const next = [draft, ...drafts].slice(0, 50);
  localStorage.setItem(KEY, JSON.stringify(next));
  dispatchPlaylistsChanged();
}

export function removeDraft(id: string) {
  if (typeof window === "undefined") return;
  const drafts = getAllDrafts();
  localStorage.setItem(KEY, JSON.stringify(drafts.filter((d) => d.id !== id)));
  dispatchPlaylistsChanged();
}

// Updates a draft in place — used when someone resumes an existing draft,
// changes it further, and saves again, so it doesn't create a second
// duplicate entry alongside the original. createdAt is left untouched for
// the same reason updateEvent leaves it alone: it should still reflect
// when the draft was first started.
export function updateDraft(id: string, updates: Omit<DraftPlaylist, "id" | "createdAt">) {
  if (typeof window === "undefined") return;
  const drafts = getAllDrafts();
  const next = drafts.map((d) => (d.id === id ? { ...d, ...updates, id: d.id, createdAt: d.createdAt } : d));
  localStorage.setItem(KEY, JSON.stringify(next));
}
