import { useCallback, useEffect, useRef, useState } from "react";
import { useGanttScroll, useGanttViewport } from "../context/contexts";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";

/** Pointer state stays in the overlay; mouse movement must not rerender task rows. */
export function useTimelinePointer(
  enabled: boolean,
  headerHeight: number,
  totalWidth: number,
): number | null {
  const { gridRef, gridBodyRef } = useGanttScroll();
  const viewport = useGanttViewport();
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const frame = useRef<number | null>(null);
  const [x, setX] = useState<number | null>(null);

  const measure = useCallback(() => {
    const grid = gridRef.current;
    const body = gridBodyRef.current;
    const position = pointer.current;
    if (!enabled || !grid || !body || !position) {
      setX(null);
      return;
    }
    const gridRect = grid.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    const left = gridRect.left + grid.clientLeft;
    const top = gridRect.top + grid.clientTop;
    // The sticky calendar covers part of the body after vertical scrolling.
    // Client dimensions also exclude scrollbars, which are not hoverable dates.
    const inside =
      position.x >= left &&
      position.x < left + grid.clientWidth &&
      position.y >= Math.max(top + headerHeight, bodyRect.top) &&
      position.y < Math.min(top + grid.clientHeight, bodyRect.bottom);
    const next = position.x - bodyRect.left - body.clientLeft;
    setX(inside && next >= 0 && next < totalWidth ? next : null);
  }, [enabled, gridRef, gridBodyRef, headerHeight, totalWidth]);

  useEffect(() => {
    const body = gridBodyRef.current;
    if (!enabled || !body) {
      return;
    }
    const schedule = () => {
      if (frame.current !== null) {
        return;
      }
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        measure();
      });
    };
    const move = (event: MouseEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY };
      schedule();
    };
    const leave = () => {
      pointer.current = null;
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
      setX(null);
    };
    // Capture still observes moves over children that stop event propagation.
    body.addEventListener("mousemove", move, true);
    body.addEventListener("mouseenter", move);
    body.addEventListener("mouseleave", leave);
    window.addEventListener("blur", leave);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      body.removeEventListener("mousemove", move, true);
      body.removeEventListener("mouseenter", move);
      body.removeEventListener("mouseleave", leave);
      window.removeEventListener("blur", leave);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
    };
  }, [enabled, gridBodyRef, measure]);

  useIsomorphicLayoutEffect(() => {
    if (!enabled) {
      pointer.current = null;
    }
    measure();
  }, [enabled, measure, viewport]);

  return enabled ? x : null;
}
