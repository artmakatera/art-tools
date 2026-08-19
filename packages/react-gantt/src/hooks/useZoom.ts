import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { dateAtOffset, getMinMaxDates, resolveOrigin, unitOffset } from "../core/dateUtils";
import { resolveColumnStep, resolveColumnUnit } from "../core/scales";
import type { ZoomLevel } from "../core/zoom";
import type { GanttTask } from "../types";
import { useLatestRef } from "./useLatestRef";

interface UseZoomParams {
  gridRef: React.RefObject<HTMLDivElement | null>;
  visibleTasks: GanttTask[];
  padDays: number;
  levels: ZoomLevel[];
  initialIndex: number;
}

export interface ZoomState {
  index: number;
  level: ZoomLevel;
  count: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  /** Step one rung finer, keeping the viewport-center date fixed. */
  zoomIn: () => void;
  /** Step one rung coarser, keeping the viewport-center date fixed. */
  zoomOut: () => void;
  /** Jump to a rung (clamped), keeping the viewport-center date fixed. */
  setZoom: (index: number) => void;
  /**
   * Step by `delta` rungs while keeping the date currently under `focusPx`
   * (content-space px = scrollLeft + offset-in-viewport) under that same pixel.
   * Used by wheel-zoom to anchor on the cursor.
   */
  zoomAt: (focusPx: number, delta: number) => void;
}

/** What to restore after the grid re-renders at the new level. */
interface PendingAnchor {
  date: Date;
  /** Pixels from the viewport's left edge that the focus date should keep. */
  viewportOffset: number;
}

/**
 * Library-managed zoom: holds the active level index and, on every level change,
 * keeps a focus date pinned to its screen position. The focus date + its
 * viewport offset are captured (at the *previous* level) when a zoom is
 * requested, then — after the grid has re-rendered at the new level — the layout
 * effect converts the date back to pixels and reassigns `scrollLeft`.
 */
export function useZoom({
  gridRef,
  visibleTasks,
  padDays,
  levels,
  initialIndex,
}: UseZoomParams): ZoomState {
  const clamp = useCallback(
    (i: number) => Math.max(0, Math.min(levels.length - 1, i)),
    [levels.length],
  );
  const [index, setIndex] = useState(() => clamp(initialIndex));

  const indexRef = useLatestRef(index);
  const visibleTasksRef = useLatestRef(visibleTasks);
  const padDaysRef = useLatestRef(padDays);
  const levelsRef = useLatestRef(levels);
  const pending = useRef<PendingAnchor | null>(null);

  const zoomAt = useCallback(
    (focusPx: number, delta: number) => {
      const cur = indexRef.current;
      const next = clamp(cur + delta);
      if (next === cur) {
        return;
      }
      const grid = gridRef.current;
      const range = getMinMaxDates(visibleTasksRef.current);
      if (grid && range) {
        const level = levelsRef.current[cur]!;
        const unit = resolveColumnUnit(level.scales);
        const step = resolveColumnStep(level.scales);
        const origin = resolveOrigin(range.min, unit, padDaysRef.current, step);
        pending.current = {
          date: dateAtOffset(origin, unit, focusPx / level.colWidth),
          viewportOffset: focusPx - grid.scrollLeft,
        };
      } else {
        pending.current = null;
      }
      setIndex(next);
    },
    [clamp, gridRef, indexRef, visibleTasksRef, padDaysRef, levelsRef],
  );

  const centerFocusPx = useCallback(() => {
    const grid = gridRef.current;
    return grid ? grid.scrollLeft + grid.clientWidth / 2 : 0;
  }, [gridRef]);

  const zoomIn = useCallback(() => zoomAt(centerFocusPx(), 1), [zoomAt, centerFocusPx]);
  const zoomOut = useCallback(() => zoomAt(centerFocusPx(), -1), [zoomAt, centerFocusPx]);
  const setZoom = useCallback(
    (i: number) => zoomAt(centerFocusPx(), clamp(i) - indexRef.current),
    [zoomAt, centerFocusPx, clamp, indexRef],
  );

  // Re-anchor after the grid has committed the new level. Depends on `index`
  // only: re-running on task edits would fight the user's scroll position.
  useLayoutEffect(() => {
    const anchor = pending.current;
    if (anchor === null) {
      return;
    }
    pending.current = null;
    const grid = gridRef.current;
    const range = getMinMaxDates(visibleTasksRef.current);
    if (!grid || !range) {
      return;
    }
    const level = levelsRef.current[index]!;
    const unit = resolveColumnUnit(level.scales);
    const step = resolveColumnStep(level.scales);
    const origin = resolveOrigin(range.min, unit, padDaysRef.current, step);
    const targetContentPx = unitOffset(origin, anchor.date, unit) * level.colWidth;
    grid.scrollLeft = Math.max(0, targetContentPx - anchor.viewportOffset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return {
    index,
    level: levels[index]!,
    count: levels.length,
    canZoomIn: index < levels.length - 1,
    canZoomOut: index > 0,
    zoomIn,
    zoomOut,
    setZoom,
    zoomAt,
  };
}
