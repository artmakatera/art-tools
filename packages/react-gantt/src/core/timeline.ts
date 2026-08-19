import type { CalendarUnit, Scale } from "../types";
import { resolveColumnStep, resolveColumnUnit } from "./scales";
import { addUnit, buildDates, getMinMaxDates, startOfUnit, unitOffset } from "./dateUtils";

/**
 * Task-range → timeline geometry. The only layer that knows both about tasks and
 * about scales; `dateUtils` below it is pure unit/instant math with no notion of
 * either.
 */

/** The minimum a timeline needs to know about a task to place it. */
export interface TaskDates {
  startDate: Date;
  endDate?: Date;
}

/**
 * The timeline origin: the start-of-unit boundary containing the earliest task,
 * padded outward by `pad` whole columns.
 *
 * Every consumer must derive the origin from here. There were five separate
 * copies of the `getMinMaxDates` → `resolveColumnUnit` → `resolveColumnStep` →
 * `resolveOrigin` recipe (two of them byte-identical, in `useZoom`), and they did
 * not all agree — see {@link resolveOriginAt}.
 *
 * Returns `null` when there are no tasks, i.e. no timeline to place anything on.
 */
export function timelineOrigin(
  tasks: readonly TaskDates[],
  scales: Scale[] | undefined,
  pad: number,
): Date | null {
  const range = getMinMaxDates(tasks);
  if (!range) {
    return null;
  }
  return resolveOriginAt(range.min, resolveColumnUnit(scales), pad, resolveColumnStep(scales));
}

/**
 * The padded start-of-unit boundary at or before `min`.
 *
 * The trailing `startOfUnit` is load-bearing, and is the fix for a real bug: for
 * `day` and `week`, `addUnit` routes through `addDays`, which zeroes to local
 * midnight and then adds a *fixed* number of milliseconds. Across a DST boundary
 * that lands on 23:00 or 01:00 rather than midnight — so the padded origin was not
 * on a unit boundary at all.
 *
 * The grid never saw it, because it read `dates[0]` from `buildDates`, whose first
 * element is `addUnit(start, unit, 0)` — which re-zeroes the time. The task list
 * and `useZoom` used the un-re-zeroed value directly, so the two disagreed by up
 * to 23 hours: ~38px, nearly a whole column at the default `colWidth`, in any DST
 * timezone. In UTC the drift is zero, which is why it went unnoticed.
 *
 * Normalising here makes the boundary claim true for every caller, and matches
 * what the grid was already using.
 */
export function resolveOriginAt(min: Date, unit: CalendarUnit, pad: number, step: number): Date {
  return startOfUnit(addUnit(startOfUnit(min, unit), unit, -pad * step), unit);
}

/**
 * The full column axis: one date per column, from the padded origin through the
 * padded end of the last task.
 */
export function buildTimelineDates(tasks: readonly TaskDates[], pad = 0, scales?: Scale[]): Date[] {
  const range = getMinMaxDates(tasks);
  if (!range) {
    return [];
  }
  const unit = resolveColumnUnit(scales);
  const step = resolveColumnStep(scales);
  const start = resolveOriginAt(range.min, unit, pad, step);
  const end = addUnit(startOfUnit(range.max, unit), unit, pad * step);
  const count = Math.round(unitOffset(start, end, unit) / step) + 1;
  return buildDates(start, count, unit, step);
}
