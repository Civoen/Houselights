"use client";
import { useCallback, useRef, useState } from "react";

export function useUndoToast<T>() {
  const [toast, setToast] = useState<{ message: string; payload: T } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, payload: T, durationMs = 4500) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, payload });
    timerRef.current = setTimeout(() => setToast(null), durationMs);
  }, []);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return { toast, show, dismiss };
}
