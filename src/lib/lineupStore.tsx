"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { LineupArtist, PlaylistTrack, SpotifyArtist, FilterType } from "./types";

interface LineupState {
  lineup: LineupArtist[];
  playlist: PlaylistTrack[];
  playlistName: string;
  playlistDescription: string;
  coverImageBase64?: string;
  addArtist: (artist: SpotifyArtist) => void;
  removeArtist: (artistId: string) => void;
  toggleFilter: (artistId: string, filter: FilterType) => void;
  setCount: (artistId: string, count: number) => void;
  addPickedTrack: (artistId: string, trackId: string) => void;
  setPlaylist: (tracks: PlaylistTrack[]) => void;
  removeTrack: (index: number) => void;
  reorderTrack: (from: number, to: number) => void;
  addTrackToPlaylist: (track: PlaylistTrack) => void;
  setPlaylistMeta: (name: string, description: string) => void;
  setCoverImage: (base64: string | undefined) => void;
  reset: () => void;
}

const LineupContext = createContext<LineupState | null>(null);

const STORAGE_KEY = "houselights_lineup_v2";

export function LineupProvider({ children }: { children: React.ReactNode }) {
  const [lineup, setLineup] = useState<LineupArtist[]>([]);
  const [playlist, setPlaylistState] = useState<PlaylistTrack[]>([]);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistDescription, setPlaylistDescription] = useState("");
  const [coverImageBase64, setCoverImageBase64] = useState<string | undefined>(undefined);

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
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ lineup, playlist, playlistName, playlistDescription, coverImageBase64 })
    );
  }, [lineup, playlist, playlistName, playlistDescription, coverImageBase64]);

  const addArtist = useCallback((artist: SpotifyArtist) => {
    setLineup((prev) => {
      if (prev.some((a) => a.artist.id === artist.id)) return prev;
      const isFirst = prev.length === 0;
      return [...prev, { artist, filters: ["popular"] as FilterType[], count: isFirst ? 20 : 10, pickedTrackIds: [] }];
    });
  }, []);

  const removeArtist = useCallback((artistId: string) => {
    setLineup((prev) => prev.filter((a) => a.artist.id !== artistId));
  }, []);

  const toggleFilter = useCallback((artistId: string, filter: FilterType) => {
    setLineup((prev) =>
      prev.map((a) => {
        if (a.artist.id !== artistId) return a;
        const has = a.filters.includes(filter);
        if (has) {
          if (a.filters.length === 1) return a; // keep at least one filter selected
          return { ...a, filters: a.filters.filter((f) => f !== filter) };
        }
        return { ...a, filters: [...a.filters, filter] };
      })
    );
  }, []);

  const setCount = useCallback((artistId: string, count: number) => {
    setLineup((prev) =>
      prev.map((a) => (a.artist.id === artistId ? { ...a, count: Math.max(1, count) } : a))
    );
  }, []);

  const addPickedTrack = useCallback((artistId: string, trackId: string) => {
    setLineup((prev) =>
      prev.map((a) =>
        a.artist.id === artistId
          ? { ...a, pickedTrackIds: Array.from(new Set([...a.pickedTrackIds, trackId])) }
          : a
      )
    );
  }, []);

  const setPlaylist = useCallback((tracks: PlaylistTrack[]) => setPlaylistState(tracks), []);

  const removeTrack = useCallback((index: number) => {
    setPlaylistState((prev) => prev.filter((_, i) => i !== index));
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

  const reset = useCallback(() => {
    setLineup([]);
    setPlaylistState([]);
    setPlaylistName("");
    setPlaylistDescription("");
    setCoverImageBase64(undefined);
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
        addArtist,
        removeArtist,
        toggleFilter,
        setCount,
        addPickedTrack,
        setPlaylist,
        removeTrack,
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
