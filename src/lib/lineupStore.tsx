"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { LineupArtist, PlaylistTrack, SpotifyArtist, SpotifyTrack, FilterType, PlaylistSizeMode } from "./types";

interface LineupState {
  lineup: LineupArtist[];
  playlist: PlaylistTrack[];
  playlistName: string;
  playlistDescription: string;
  coverImageBase64?: string;
  eventDate: string;
  setEventDate: (date: string) => void;
  playlistSizeMode: PlaylistSizeMode;
  playlistSizeValue: number;
  setPlaylistSize: (mode: PlaylistSizeMode, value: number) => void;
  addArtist: (artist: SpotifyArtist) => void;
  removeArtist: (artistId: string) => void;
  restoreArtist: (entry: LineupArtist, index: number) => void;
  reorderArtist: (from: number, to: number) => void;
  setFilter: (artistId: string, filter: FilterType) => void;
  setWeight: (artistId: string, weight: number) => void;
  addPickedTrack: (artistId: string, track: SpotifyTrack) => void;
  removePickedTrack: (artistId: string, trackId: string) => void;
  setPlaylist: (tracks: PlaylistTrack[]) => void;
  removeTrack: (index: number) => void;
  restoreTrack: (track: PlaylistTrack, index: number) => void;
  reorderTrack: (from: number, to: number) => void;
  addTrackToPlaylist: (track: PlaylistTrack) => void;
  setPlaylistMeta: (name: string, description: string) => void;
  setCoverImage: (base64: string | undefined) => void;
  reset: () => void;
}

const LineupContext = createContext<LineupState | null>(null);

const STORAGE_KEY = "houselights_lineup_v4";
const DEFAULT_SIZE_MODE: PlaylistSizeMode = "songs";
const DEFAULT_SIZE_VALUE = 40;

export function LineupProvider({ children }: { children: React.ReactNode }) {
  const [lineup, setLineup] = useState<LineupArtist[]>([]);
  const [playlist, setPlaylistState] = useState<PlaylistTrack[]>([]);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistDescription, setPlaylistDescription] = useState("");
  const [coverImageBase64, setCoverImageBase64] = useState<string | undefined>(undefined);
  const [eventDate, setEventDateState] = useState("");
  const [playlistSizeMode, setPlaylistSizeMode] = useState<PlaylistSizeMode>(DEFAULT_SIZE_MODE);
  const [playlistSizeValue, setPlaylistSizeValue] = useState(DEFAULT_SIZE_VALUE);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setLineup(parsed.lineup || []);
        setPlaylistState(parsed.playlist || []);
        setPlaylistName(parsed.playlistName || "");
        setPlaylistDescription(parsed.playlistDescription || "");
        setCoverImageBase64(parsed.coverImageBase64);
        setEventDateState(parsed.eventDate || "");
        setPlaylistSizeMode(parsed.playlistSizeMode || DEFAULT_SIZE_MODE);
        setPlaylistSizeValue(parsed.playlistSizeValue || DEFAULT_SIZE_VALUE);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        lineup,
        playlist,
        playlistName,
        playlistDescription,
        coverImageBase64,
        eventDate,
        playlistSizeMode,
        playlistSizeValue,
      })
    );
  }, [lineup, playlist, playlistName, playlistDescription, coverImageBase64, eventDate, playlistSizeMode, playlistSizeValue]);

  const addArtist = useCallback((artist: SpotifyArtist) => {
    setLineup((prev) => {
      if (prev.some((a) => a.artist.id === artist.id)) return prev;
      const isFirst = prev.length === 0;
      return [...prev, { artist, filters: ["popular"] as FilterType[], weight: isFirst ? 2 : 1, pickedTracks: [] }];
    });
  }, []);

  const removeArtist = useCallback((artistId: string) => {
    setLineup((prev) => prev.filter((a) => a.artist.id !== artistId));
  }, []);

  const restoreArtist = useCallback((entry: LineupArtist, index: number) => {
    setLineup((prev) => {
      if (prev.some((a) => a.artist.id === entry.artist.id)) return prev;
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, entry);
      return next;
    });
  }, []);

  const reorderArtist = useCallback((from: number, to: number) => {
    setLineup((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  // Single-select: choosing a filter replaces whatever was selected,
  // rather than toggling membership in a multi-select set. "Most popular"
  // and "Setlist" pull from genuinely different, non-combinable sources
  // (Spotify relevance vs. actual live setlists), so picking one is meant
  // to be a real either/or choice, not a blend of both pools.
  const setFilter = useCallback((artistId: string, filter: FilterType) => {
    setLineup((prev) => prev.map((a) => (a.artist.id === artistId ? { ...a, filters: [filter] } : a)));
  }, []);

  const setWeight = useCallback((artistId: string, weight: number) => {
    setLineup((prev) =>
      prev.map((a) => (a.artist.id === artistId ? { ...a, weight: Math.max(1, weight) } : a))
    );
  }, []);

  const addPickedTrack = useCallback((artistId: string, track: SpotifyTrack) => {
    setLineup((prev) =>
      prev.map((a) => {
        if (a.artist.id !== artistId) return a;
        if (a.pickedTracks.some((t) => t.id === track.id)) return a;
        return { ...a, pickedTracks: [...a.pickedTracks, track] };
      })
    );
  }, []);

  const removePickedTrack = useCallback((artistId: string, trackId: string) => {
    setLineup((prev) =>
      prev.map((a) =>
        a.artist.id === artistId
          ? { ...a, pickedTracks: a.pickedTracks.filter((t) => t.id !== trackId) }
          : a
      )
    );
  }, []);

  const setPlaylist = useCallback((tracks: PlaylistTrack[]) => setPlaylistState(tracks), []);

  const removeTrack = useCallback((index: number) => {
    setPlaylistState((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const restoreTrack = useCallback((track: PlaylistTrack, index: number) => {
    setPlaylistState((prev) => {
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, track);
      return next;
    });
  }, []);

  const reorderTrack = useCallback((from: number, to: number) => {
    setPlaylistState((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const addTrackToPlaylist = useCallback((track: PlaylistTrack) => {
    setPlaylistState((prev) => (prev.some((t) => t.id === track.id) ? prev : [...prev, track]));
  }, []);

  const setPlaylistMeta = useCallback((name: string, description: string) => {
    setPlaylistName(name);
    setPlaylistDescription(description);
  }, []);

  const setCoverImage = useCallback((base64: string | undefined) => setCoverImageBase64(base64), []);
  const setEventDate = useCallback((date: string) => setEventDateState(date), []);
  const setPlaylistSize = useCallback((mode: PlaylistSizeMode, value: number) => {
    setPlaylistSizeMode(mode);
    setPlaylistSizeValue(Math.max(1, value));
  }, []);

  const reset = useCallback(() => {
    setLineup([]);
    setPlaylistState([]);
    setPlaylistName("");
    setPlaylistDescription("");
    setCoverImageBase64(undefined);
    setEventDateState("");
    setPlaylistSizeMode(DEFAULT_SIZE_MODE);
    setPlaylistSizeValue(DEFAULT_SIZE_VALUE);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <LineupContext.Provider
      value={{
        lineup,
        playlist,
        playlistName,
        playlistDescription,
        coverImageBase64,
        eventDate,
        setEventDate,
        playlistSizeMode,
        playlistSizeValue,
        setPlaylistSize,
        addArtist,
        removeArtist,
        restoreArtist,
        reorderArtist,
        setFilter,
        setWeight,
        addPickedTrack,
        removePickedTrack,
        setPlaylist,
        removeTrack,
        restoreTrack,
        reorderTrack,
        addTrackToPlaylist,
        setPlaylistMeta,
        setCoverImage,
        reset,
      }}
    >
      {children}
    </LineupContext.Provider>
  );
}

export function useLineup() {
  const ctx = useContext(LineupContext);
  if (!ctx) throw new Error("useLineup must be used within LineupProvider");
  return ctx;
}
