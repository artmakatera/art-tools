/**
 * Framework-agnostic windowing math for virtualized rendering. Given a scroll
 * `offset`, a `viewSize` (viewport extent), a fixed `itemSize`, and a total
 * `itemCount`, return the half-open index range `[start, end)` of items that
 * intersect the viewport, widened by `overscan` items on each side.
 *
 * Works for either axis (rows: pass scrollTop/clientHeight/rowHeight, or
 * columns: scrollLeft/clientWidth/colWidth). Pure — no DOM or framework
 * dependency. Mirrors the shape of `scrollOffsetToReveal` in `scroll.ts`.
 *
 * When `viewSize <= 0` the viewport hasn't been measured yet (first commit),
 * so we render a bounded window of the first `UNMEASURED_FALLBACK_COUNT`
 * items. Rendering everything here would make mounting a large dataset pay a
 * full unvirtualized commit (10k tasks ≈ tens of seconds) that is thrown away
 * one frame later; rendering the capped window is never visible as a flash,
 * because the real metrics arrive via `useLayoutEffect` and re-render before
 * the browser paints. The cap also keeps jsdom (client sizes always 0)
 * rendering enough rows for component tests. `itemSize <= 0` is treated the
 * same way.
 */
import { UNMEASURED_FALLBACK_COUNT } from "./constants";

export interface IndexRange {
  /** First visible item index (inclusive). */
  start: number;
  /** One past the last visible item index (exclusive). */
  end: number;
}

export function rangeFromOffset(
  offset: number,
  viewSize: number,
  itemSize: number,
  itemCount: number,
  overscan = 0,
): IndexRange {
  if (itemCount <= 0) {
    return { start: 0, end: 0 };
  }
  if (viewSize <= 0 || itemSize <= 0) {
    return { start: 0, end: Math.min(itemCount, UNMEASURED_FALLBACK_COUNT) };
  }

  const firstVisible = Math.floor(offset / itemSize);
  const lastVisible = Math.ceil((offset + viewSize) / itemSize);

  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(itemCount, lastVisible + overscan);

  return { start, end };
}
