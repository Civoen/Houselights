"use client";
import { useRef, useState, useCallback } from "react";

// Swipe-left-to-reveal-an-action, built on Pointer Events for the same
// touchscreen-compatibility reason as useReorder. Capture is deliberately
// deferred until real horizontal intent is detected (moved further
// horizontally than vertically, past a small threshold) — grabbing the
// pointer on every touch would swallow ordinary taps on buttons/links
// inside the row before they ever fire.
export function useSwipeReveal(revealWidth: number) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ id: string; x: number } | null>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; baseOffset: number; active: boolean } | null>(null);
  const justDraggedRef = useRef(false);

  const handlePointerDown = useCallback(
    (id: string) => (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if ((e.target as HTMLElement).closest("[data-no-swipe]")) return;
      dragRef.current = { id, startX: e.clientX, startY: e.clientY, baseOffset: openId === id ? -revealWidth : 0, active: false };
    },
    [openId, revealWidth]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (!drag.active) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
        drag.active = true;
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      const next = Math.min(0, Math.max(-revealWidth, drag.baseOffset + dx));
      setDragOffset({ id: drag.id, x: next });
    },
    [revealWidth]
  );

  const finish = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || !drag.active) {
      setDragOffset(null);
      return;
    }
    justDraggedRef.current = true;
    setDragOffset((current) => {
      const finalX = current && current.id === drag.id ? current.x : drag.baseOffset;
      setOpenId(finalX < -revealWidth / 2 ? drag.id : null);
      return null;
    });
  }, [revealWidth]);

  const close = useCallback(() => setOpenId(null), []);

  // A tap-to-open handler should call this first and bail if it returns
  // true — browsers still synthesize a click after a drag in some cases,
  // and without this a swipe that snaps back closed could also fire an
  // unwanted navigation.
  const consumeWasDragging = useCallback(() => {
    const was = justDraggedRef.current;
    justDraggedRef.current = false;
    return was;
  }, []);

  const offsetFor = useCallback(
    (id: string) => {
      if (dragOffset && dragOffset.id === id) return dragOffset.x;
      return openId === id ? -revealWidth : 0;
    },
    [dragOffset, openId, revealWidth]
  );

  const isDragging = useCallback((id: string) => dragOffset !== null && dragOffset.id === id, [dragOffset]);

  return {
    openId,
    offsetFor,
    isDragging,
    close,
    consumeWasDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp: finish,
    handlePointerCancel: finish,
  };
}
