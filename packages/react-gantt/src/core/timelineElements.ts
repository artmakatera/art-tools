import type { CalendarUnit, GanttTimelineElement } from "../types";
import { unitOffset } from "./dateUtils";

/** Validation happens on array changes, not every viewport update. */
export function validTimelineElements(
  elements: readonly GanttTimelineElement[],
): GanttTimelineElement[] {
  const keys = new Set<string>();
  return elements.filter((element) => {
    const key = String(element.key);
    if (
      keys.has(key) ||
      (element.date !== "pointer" &&
        (!(element.date instanceof Date) || !Number.isFinite(element.date.getTime()))) ||
      typeof element.render !== "function"
    ) {
      if ((import.meta as ImportMeta & { env: { DEV: boolean } }).env.DEV) {
        console.warn(`Invalid timeline element date, render or duplicate key: ${key}`);
      }
      return false;
    }
    keys.add(key);
    return true;
  });
}

/** Use the column step too: an element marks an instant, without working-time snapping. */
export function timelineElementX(
  date: Date,
  origin: Date,
  unit: CalendarUnit,
  step: number,
  colWidth: number,
): number {
  return (unitOffset(origin, date, unit) / step) * colWidth;
}

export function isTimelineElementVisible(
  x: number,
  totalWidth: number,
  scrollLeft: number,
  clientWidth: number,
  overscanPx = 256,
): boolean {
  const overscan = Number.isFinite(overscanPx) ? Math.max(0, overscanPx) : 256;
  return (
    x >= 0 &&
    x < totalWidth &&
    x >= scrollLeft - overscan &&
    x <= scrollLeft + clientWidth + overscan
  );
}
