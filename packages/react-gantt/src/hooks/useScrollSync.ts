import { useCallback, useEffect, useRef, useState } from "react";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";

/** Scroll offset + client size of the grid viewport, read for virtualization. */
export interface ViewportMetrics {
  scrollTop: number;
  scrollLeft: number;
  clientWidth: number;
  clientHeight: number;
}

const ZERO_METRICS: ViewportMetrics = {
  scrollTop: 0,
  scrollLeft: 0,
  clientWidth: 0,
  clientHeight: 0,
};

function readMetrics(el: HTMLDivElement): ViewportMetrics {
  return {
    scrollTop: el.scrollTop,
    scrollLeft: el.scrollLeft,
    clientWidth: el.clientWidth,
    clientHeight: el.clientHeight,
  };
}

function sameMetrics(a: ViewportMetrics, b: ViewportMetrics): boolean {
  return (
    a.scrollTop === b.scrollTop &&
    a.scrollLeft === b.scrollLeft &&
    a.clientWidth === b.clientWidth &&
    a.clientHeight === b.clientHeight
  );
}

export function useScrollSync() {
  const taskListRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);
  const frameRef = useRef<number | null>(null);

  const [viewport, setViewport] = useState<ViewportMetrics>(ZERO_METRICS);

  // Coalesce bursts of scroll/resize events into one state update per frame.
  const scheduleMeasure = useCallback(() => {
    if (frameRef.current !== null) {
      return;
    }
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const grid = gridRef.current;
      if (!grid) {
        return;
      }
      const next = readMetrics(grid);
      setViewport((prev) => (sameMetrics(prev, next) ? prev : next));
    });
  }, []);

  const onTaskListScroll = useCallback(() => {
    if (isSyncing.current) {
      return;
    }
    if (!taskListRef.current || !gridRef.current) {
      return;
    }
    isSyncing.current = true;
    gridRef.current.scrollTop = taskListRef.current.scrollTop;
    isSyncing.current = false;
    scheduleMeasure();
  }, [scheduleMeasure]);

  const onGridScroll = useCallback(() => {
    if (gridRef.current && taskListRef.current && !isSyncing.current) {
      isSyncing.current = true;
      taskListRef.current.scrollTop = gridRef.current.scrollTop;
      isSyncing.current = false;
    }
    scheduleMeasure();
  }, [scheduleMeasure]);

  // Measure synchronously before first paint to avoid a blank initial frame,
  // and keep client size in sync with container resizes.
  // (Isomorphic: plain useEffect during SSR to avoid React 18's server warning.)
  useIsomorphicLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
      return;
    }
    setViewport((prev) => {
      const next = readMetrics(grid);
      return sameMetrics(prev, next) ? prev : next;
    });
  }, []);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(grid);
    return () => {
      observer.disconnect();
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [scheduleMeasure]);

  return { taskListRef, gridRef, onTaskListScroll, onGridScroll, viewport };
}
