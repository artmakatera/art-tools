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
 * When `viewSize <= 0` the viewport hasn't been measured yet (first paint), so
 * we render everything rather than nothing — this avoids a blank initial frame
 * and a flash of empty content. `itemSize <= 0` is treated the same way.
 */
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
    return { start: 0, end: itemCount };
  }

  const firstVisible = Math.floor(offset / itemSize);
  const lastVisible = Math.ceil((offset + viewSize) / itemSize);

  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(itemCount, lastVisible + overscan);

  return { start, end };
}
