import { addEvent, updateEvent, getAllEvents } from "@/lib/eventHistory";
import { removeDraft } from "@/lib/drafts";
import { triggerWristbandCheck } from "@/lib/wristbandTracker";
import { LineupArtist, PlaylistTrack } from "@/lib/types";

interface CreateOrUpdatePlaylistParams {
  name: string;
  description: string;
  coverImageBase64?: string;
  playlist: PlaylistTrack[];
  lineup: LineupArtist[];
  eventDate: string;
  editingPlaylistId: string | null;
  resumedDraftId: string | null;
  forceNew?: boolean;
}

// Shared by both the Create page (where cover/title were explicitly set)
// and Preview's direct "Create playlist" button (which skips the cover
// screen and calls this with generated defaults) — one place for the
// actual Spotify call, event-history bookkeeping, draft cleanup, and
// wristband check, so the two entry points can't quietly drift apart.
// Returns the query string to push to /success.
export async function createOrUpdatePlaylist(params: CreateOrUpdatePlaylistParams): Promise<string> {
  const {
    name,
    description,
    coverImageBase64,
    playlist,
    lineup,
    eventDate,
    editingPlaylistId,
    resumedDraftId,
    forceNew,
  } = params;

  const isEditing = !!editingPlaylistId && !forceNew;
  const isFirstEver = !isEditing && getAllEvents().length === 0;

  const res = await fetch(isEditing ? "/api/playlist/update" : "/api/playlist/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(isEditing ? { playlistId: editingPlaylistId } : {}),
      name,
      description,
      trackUris: playlist.map((t) => t.uri),
      coverImageBase64,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `Something went wrong ${isEditing ? "saving" : "creating"} the playlist.`);
  }

  const url = json.playlist?.url as string;
  const playlistId = json.playlist?.id as string;
  const coverFailed = !!coverImageBase64 && json.playlist?.coverUploaded === false;
  const coverErrorStatus = json.playlist?.coverErrorStatus as number | undefined;
  const coverErrorBody = json.playlist?.coverErrorBody as string | undefined;
  const totalMs = playlist.reduce((s, t) => s + t.durationMs, 0);

  const eventFields = {
    name,
    description,
    url: url || "",
    trackCount: playlist.length,
    totalMinutes: Math.round(totalMs / 60000),
    artistNames: lineup.map((a) => a.artist.name),
    headliner:
      lineup[0]?.artist ||
      { id: playlist[0]?.artistId || "", name: playlist[0]?.artist || "Unknown", genres: [] },
    eventDate: eventDate || undefined,
    tracks: playlist,
  };

  if (isEditing) {
    updateEvent(editingPlaylistId!, eventFields);
  } else {
    addEvent({ id: playlistId || crypto.randomUUID(), createdAt: new Date().toISOString(), ...eventFields });
    // This session started from resuming a saved Draft and just actually
    // became a real playlist — remove the draft so it doesn't linger
    // duplicated as both a draft and a real playlist.
    if (resumedDraftId) removeDraft(resumedDraftId);
  }

  triggerWristbandCheck();

  return `/success?url=${encodeURIComponent(url || "")}&name=${encodeURIComponent(name)}${isFirstEver ? "&first=1" : ""}${coverFailed ? "&coverFailed=1" : ""}${coverFailed && coverErrorStatus ? `&coverErrorStatus=${coverErrorStatus}` : ""}${coverFailed && coverErrorBody ? `&coverErrorBody=${encodeURIComponent(coverErrorBody)}` : ""}${isEditing ? "&updated=1" : ""}`;
}

// Same "[Headliner], [Date]" format used as the default playlist name on
// both Preview (draft save + direct create) and the Create page, so a
// draft resumed later and a playlist created fresh both land on the same
// default rather than two formats drifting apart.
export function defaultPlaylistName(headlinerName: string | undefined): string {
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return headlinerName ? `${headlinerName}, ${today}` : `My playlist, ${today}`;
}

export function defaultPlaylistDescription(artistNames: string[]): string {
  return `${artistNames.join(", ")} · Prepped with Houselights`;
}
