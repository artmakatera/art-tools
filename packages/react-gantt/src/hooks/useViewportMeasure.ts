import { useCallback, useEffect, useRef, useState } from "react";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";
import { useLatestRef } from "./useLatestRef";

/** Scroll offset + client size of a scroll viewport, read for virtualization. */
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

function sameMetrics(a: ViewportMetrics, b: ViewportMetrics, trackHorizontal: boolean): boolean {
  if (a.scrollTop !== b.scrollTop || a.clientHeight !== b.clientHeight) {
    return false;
  }
  if (!trackHorizontal) {
    return true;
  }
  return a.scrollLeft === b.scrollLeft && a.clientWidth === b.clientWidth;
}

interface UseViewportMeasureOptions {
  /**
   * Include scrollLeft/clientWidth in change detection. Off for panes that
   * only window rows vertically (TaskList): width churn from column/splitter
   * resizes must not re-render them.
   */
  trackHorizontal?: boolean;
}

/**
 * Track a scroll container's viewport metrics for virtualization: measured
 * before first paint, kept in sync via ResizeObserver, and re-measured on
 * demand (`scheduleMeasure`, typically from an onScroll handler). Bursts of
 * scroll/resize events coalesce into one state update per frame, with an
 * identity bail-out when metrics are unchanged. `scheduleMeasure` is
 * identity-stable forever.
 */
export function useViewportMeasure(
  targetRef: React.RefObject<HTMLDivElement | null>,
  { trackHorizontal = true }: UseViewportMeasureOptions = {},
): { viewport: ViewportMetrics; scheduleMeasure: () => void } {
  const frameRef = useRef<number | null>(null);
  const trackHorizontalRef = useLatestRef(trackHorizontal);

  const [viewport, setViewport] = useState<ViewportMetrics>(ZERO_METRICS);

  // Coalesce bursts of scroll/resize events into one state update per frame.
  const scheduleMeasure = useCallback(() => {
    if (frameRef.current !== null) {
      return;
    }
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const el = targetRef.current;
      if (!el) {
        return;
      }
      const next = readMetrics(el);
      setViewport((prev) => (sameMetrics(prev, next, trackHorizontalRef.current) ? prev : next));
    });
  }, [targetRef, trackHorizontalRef]);

  // Measure synchronously before first paint to avoid a blank initial frame,
  // and keep client size in sync with container resizes.
  // (Isomorphic: plain useEffect during SSR to avoid React 18's server warning.)
  useIsomorphicLayoutEffect(() => {
    const el = targetRef.current;
    if (!el) {
      return;
    }
    setViewport((prev) => {
      const next = readMetrics(el);
      return sameMetrics(prev, next, trackHorizontalRef.current) ? prev : next;
    });
  }, [targetRef]);

  useEffect(() => {
    const el = targetRef.current;
    if (!el || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [scheduleMeasure, targetRef]);

  return { viewport, scheduleMeasure };
}
