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
        if (!el || i === current) return; // dragged item's own (moving) rect shouldn't compete against neighbors' static ones
        const rect = el.getBoundingClientRect();
        // Direct containment wins immediately — no need for the pointer to
        // reach a row's exact center before it's recognized as the target.
        if (y >= rect.top && y <= rect.bottom) {
          closest = i;
          closestDist = 0;
          return;
        }
        if (closestDist === 0) return;
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

// Same Pointer Events approach as useReorder, but scoped to groups — items
// are addressed as (groupId, localIndex) instead of a single flat index, and
// a drag started in one group can only be dropped within that same group.
// Used for reordering an artist's songs inside its expanded group without
// letting the drag spill into a neighboring artist's list.
export function useGroupedReorder(onReorder: (groupId: string, from: number, to: number) => void) {
  const [dragGroupId, setDragGroupId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const startYRef = useRef(0);
  const itemRefs = useRef<Record<string, (HTMLElement | null)[]>>({});

  const setItemRef = useCallback(
    (groupId: string, index: number) => (el: HTMLElement | null) => {
      if (!itemRefs.current[groupId]) itemRefs.current[groupId] = [];
      itemRefs.current[groupId][index] = el;
    },
    []
  );

  const handlePointerDown = useCallback(
    (groupId: string, index: number) => (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      setDragGroupId(groupId);
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
    setDragGroupId((currentGroup) => {
      if (currentGroup === null) return currentGroup;
      setDragIndex((currentIdx) => {
        const y = e.clientY;
        setDragOffsetY(y - startYRef.current);
        const refs = itemRefs.current[currentGroup] || [];
        let closest: number | null = null;
        let closestDist = Infinity;
        refs.forEach((el, i) => {
          if (!el || i === currentIdx) return; // dragged item's own (moving) rect shouldn't compete against neighbors' static ones
          const rect = el.getBoundingClientRect();
          if (y >= rect.top && y <= rect.bottom) {
            closest = i;
            closestDist = 0;
            return;
          }
          if (closestDist === 0) return;
          const mid = rect.top + rect.height / 2;
          const dist = Math.abs(y - mid);
          if (dist < closestDist) {
            closestDist = dist;
            closest = i;
          }
        });
        if (closest !== null) setOverIndex(closest);
        return currentIdx;
      });
      return currentGroup;
    });
  }, []);

  const finishDrag = useCallback(() => {
    setDragGroupId((groupId) => {
      setDragIndex((from) => {
        setOverIndex((to) => {
          if (groupId !== null && from !== null && to !== null && from !== to) {
            onReorder(groupId, from, to);
          }
          return null;
        });
        return null;
      });
      return null;
    });
    setDragOffsetY(0);
  }, [onReorder]);

  return {
    dragGroupId,
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
