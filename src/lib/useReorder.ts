"use client";
import { useRef, useState, useCallback } from "react";

// Native HTML5 drag-and-drop (draggable + dragstart/dragover/drop) never
// fires on touchscreens in any mobile browser — it's a mouse-only API. This
// hook uses the Pointer Events API instead, which works uniformly across
// touch, mouse, and pen, so drag-to-reorder actually works on a phone.
export function useReorder(itemCount: number, onReorder: (from: number, to: number) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const startYRef = useRef(0);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  itemRefs.current.length = itemCount;

  const setItemRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      itemRefs.current[index] = el;
    },
    []
  );

  const handlePointerDown = useCallback(
    (index: number) => (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      setDragIndex(index);
      setOverIndex(index);
      setDragOffsetY(0);
      startYRef.current = e.clientY;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    []
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    setDragIndex((current) => {
      if (current === null) return current;
      const y = e.clientY;
      setDragOffsetY(y - startYRef.current);
      let closest: number | null = null;
      let closestDist = Infinity;
      itemRefs.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        const dist = Math.abs(y - mid);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      });
      if (closest !== null) setOverIndex(closest);
      return current;
    });
  }, []);

  const finishDrag = useCallback(() => {
    setDragIndex((from) => {
      setOverIndex((to) => {
        if (from !== null && to !== null && from !== to) {
          onReorder(from, to);
        }
        return null;
      });
      return null;
    });
    setDragOffsetY(0);
  }, [onReorder]);

  return {
    dragIndex,
    overIndex,
    dragOffsetY,
    setItemRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp: finishDrag,
    handlePointerCancel: finishDrag,
  };
}
