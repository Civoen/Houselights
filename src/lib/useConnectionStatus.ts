"use client";
import { useEffect, useState } from "react";

// Whether the current device has a logged-in Spotify session — null while
// the check is in flight, then true/false. Shared rather than duplicated
// per-page, since Guest mode means more pages than just Home/Settings now
// need to know this (New Event and Preview both show a guest banner and
// gate specific actions behind it).
export function useConnectionStatus(): boolean | null {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => setConnected(!!d.connected))
      .catch(() => setConnected(false));
  }, []);

  return connected;
}
