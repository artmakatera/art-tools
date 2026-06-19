/**
 * Framework-agnostic scroll math. Given a span `[start, start + size]` and a
 * viewport of `viewSize` currently scrolled to `viewOffset`, return the scroll
 * offset that brings the span into view (keeping `margin` px of padding).
 *
 * Works for either axis (pass scrollLeft/clientWidth or scrollTop/clientHeight).
 * Pure — no DOM or framework dependency, so a Vue/Svelte/Solid/Angular adapter
 * can reuse it: read the container's metrics, call this, write the result back.
 *
 * Returns the clamped (>= 0) target offset, which equals `viewOffset` when the
 * span is already fully visible — callers can skip the write when unchanged.
 */
export function scrollOffsetToReveal(
  start: number,
  size: number,
  viewOffset: number,
  viewSize: number,
  margin = 0,
): number {
  const viewEnd = viewOffset + viewSize;
  if (start - margin < viewOffset) {
    return Math.max(0, start - margin);
  }
  if (start + size + margin > viewEnd) {
    return start + size + margin - viewSize;
  }
  return viewOffset;
}
