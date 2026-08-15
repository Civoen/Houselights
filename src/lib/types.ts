export type FilterType = "popular" | "setlist";

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  image?: string;
  followers?: number;
}

export interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  artist: string;
  artistId: string;
  album: string;
  albumImage?: string;
  durationMs: number;
  popularity: number;
  releaseDate?: string;
}

export type PlaylistSizeMode = "songs" | "time";

export interface LineupArtist {
  artist: SpotifyArtist;
  filters: FilterType[];
  weight: number;
  pickedTracks: SpotifyTrack[];
}

export interface PlaylistTrack extends SpotifyTrack {
  sourceArtistId: string;
  handpicked: boolean;
}

export interface PastEvent {
  id: string;
  name: string;
  description?: string;
  url: string;
  trackCount: number;
  totalMinutes: number;
  artistNames: string[];
  headliner: SpotifyArtist;
  eventDate?: string;
  createdAt: string;
  // Full track snapshot, saved alongside the aggregate stats since the
  // create flow already has this in memory. Optional because playlists
  // saved before this field existed won't have it — Edit falls back to
  // re-fetching from Spotify for those specifically.
  tracks?: PlaylistTrack[];
}
