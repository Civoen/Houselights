"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type ColorblindMode = "off" | "redGreen" | "blueYellow";

interface ColorblindState {
  mode: ColorblindMode;
  setMode: (m: ColorblindMode) => void;
}

const ColorblindContext = createContext<ColorblindState | null>(null);
export const COLORBLIND_STORAGE_KEY = "houselights_colorblind_mode";

export function ColorblindProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ColorblindMode>("off");

  useEffect(() => {
    const stored = localStorage.getItem(COLORBLIND_STORAGE_KEY) as ColorblindMode | null;
    const initial = stored === "redGreen" || stored === "blueYellow" ? stored : "off";
    setModeState(initial);
    document.documentElement.setAttribute("data-cb", initial);
  }, []);

  const setMode = useCallback((m: ColorblindMode) => {
    setModeState(m);
    localStorage.setItem(COLORBLIND_STORAGE_KEY, m);
    document.documentElement.setAttribute("data-cb", m);
  }, []);

  return <ColorblindContext.Provider value={{ mode, setMode }}>{children}</ColorblindContext.Provider>;
}

export function useColorblindMode() {
  const ctx = useContext(ColorblindContext);
  if (!ctx) throw new Error("useColorblindMode must be used within ColorblindProvider");
  return ctx;
}
