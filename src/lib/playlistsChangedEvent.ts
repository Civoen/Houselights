// Fired whenever a playlist or draft is added/removed, or the Playlists
// tab acknowledges what's currently there — BottomNav listens for this so
// its unread dot can appear or clear live, without needing a navigation to
// recompute. Kept as its own tiny, import-free module rather than living in
// eventHistory.ts, drafts.ts, or unreadPlaylists.ts, since all three need to
// both dispatch and (in unreadPlaylists' case) re-export it — putting it in
// any one of them would make the other two import back from it, a circular
// dependency.
export const PLAYLISTS_CHANGED_EVENT = "houselights:playlists-changed";

export function dispatchPlaylistsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PLAYLISTS_CHANGED_EVENT));
}
