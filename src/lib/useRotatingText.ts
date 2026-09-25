"use client";
import { useEffect, useState } from "react";

export function useRotatingText(active: boolean, phrases: string[], intervalMs = 1400) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % phrases.length);
    }, intervalMs);
    return () => clearInterval(id);
    // phrases is expected to be a stable/inline array — intentionally not a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, intervalMs]);

  return phrases[index] || phrases[0];
}
