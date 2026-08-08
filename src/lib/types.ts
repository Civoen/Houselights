export type FilterType = "popular" | "recent" | "deep";

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

export interface LineupArtist {
  artist: SpotifyArtist;
  filters: FilterType[];
  count: number;
  pickedTrackIds: string[];
}

export interface PlaylistTrack extends SpotifyTrack {
  sourceArtistId: string;
  handpicked: boolean;
}
