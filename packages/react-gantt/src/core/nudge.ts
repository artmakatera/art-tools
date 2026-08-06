import type { CalendarUnit, GanttTask, TaskPatch } from "../types";
import { resolveTaskDates } from "./barUtils";
import { addDays, addUnit, diffDays } from "./dateUtils";

/** Which edge a keyboard nudge moves: the whole bar, or one end of it. */
export type NudgeEdge = "move" | "start" | "end";

/** Why a nudge produced no patch, so the caller can say something useful. */
export type NudgeRefusal =
  | "derived-summary"
  | "milestone-resize"
  | "would-invert";

export type NudgeResult =
  | { patch: TaskPatch; refusal?: undefined }
  | { patch?: undefined; refusal: NudgeRefusal };

interface NudgeContext {
  /** A summary row whose dates are rolled up from its children. */
  isDerivedSummary: boolean;
}

/** Column units finer than the day granularity tasks are actually stored at. */
const SUB_DAY_UNITS = new Set<CalendarUnit>(["minute", "hour"]);

/**
 * The step a nudge should actually take.
 *
 * Task positions are day-granular — `computeTaskPixels` resolves both edges
 * through `startOfUnit(date, "day")` — so at the hour or minute rung a
 * one-column nudge would write precision the renderer immediately discards.
 * The bar wouldn't move, and pressing the opposite arrow wouldn't come back to
 * where it started, because the discarded remainder is gone. Round up to a day.
 */
function effectiveStep(unit: CalendarUnit, step: number): { unit: CalendarUnit; step: number } {
  if (SUB_DAY_UNITS.has(unit)) {
    return { unit: "day", step: 1 };
  }
  return { unit, step };
}

/**
 * One-column keyboard nudge, computed in **date space**.
 *
 * Deliberately not `moveAt(left ± colWidth)` — the route the mouse drag takes.
 * `computeTaskPixels` positions bars by their true day-granular dates, so at a
 * coarse zoom rung `left`/`width` are fractions of a variable-length unit, and
 * inverting them through `pxToEndDate` lands in a month of a different length.
 * Nudging a Jan 1–31 task one month that way yields Feb 1–28, then Mar 1–31: the
 * duration drifts on every press and `→` then `←` does not restore the original
 * dates. `addUnit` uses setMonth/setFullYear and is exactly invertible.
 *
 * Working in date space also means no mounted DOM and no `origin` — the bar may
 * be outside the virtualization window — and it makes the whole thing a pure
 * function that can be tested at every zoom rung.
 *
 * Returns a refusal instead of a patch when the nudge cannot apply, so the
 * caller can skip the undo transaction entirely and explain itself.
 */
export function nudgeTask(
  task: GanttTask,
  edge: NudgeEdge,
  unit: CalendarUnit,
  step: number,
  direction: 1 | -1,
  { isDerivedSummary }: NudgeContext,
): NudgeResult {
  // A summary's dates are recomputed from its children by `getParentTaskData`,
  // but `updateTask` builds its patch against the pre-roll-up map — so the
  // write would survive `sameTask`, append a real undo step, and then be
  // overwritten on the next render. Refuse rather than snap back.
  if (isDerivedSummary) {
    return { refusal: "derived-summary" };
  }

  const isMilestone = task.type === "milestone";
  if (isMilestone && edge !== "move") {
    return { refusal: "milestone-resize" };
  }

  const { startDate, endDate } = resolveTaskDates(task);
  const stepped = effectiveStep(unit, step);
  const amount = stepped.step * direction;

  if (edge === "move") {
    const nextStart = addUnit(startDate, stepped.unit, amount);
    if (isMilestone) {
      // A milestone is a single instant; emitting an endDate here would be
      // dropped by updateTask's guard anyway, but sending one is misleading.
      return { patch: { startDate: nextStart } };
    }
    // Preserve the span in whole days, mirroring `movedTo` in scheduling.ts.
    // Adding the same unit to both ends would stretch the task across months of
    // different lengths.
    return {
      patch: { startDate: nextStart, endDate: addDays(nextStart, diffDays(startDate, endDate)) },
    };
  }

  if (edge === "start") {
    const nextStart = addUnit(startDate, stepped.unit, amount);
    if (nextStart.getTime() > endDate.getTime()) {
      return { refusal: "would-invert" };
    }
    // Sent alone on purpose: `updateTask` writes fields independently, so a
    // start-only patch is a genuine left-edge resize rather than a move.
    return { patch: { startDate: nextStart } };
  }

  const nextEnd = addUnit(endDate, stepped.unit, amount);
  if (nextEnd.getTime() < startDate.getTime()) {
    return { refusal: "would-invert" };
  }
  return { patch: { endDate: nextEnd } };
}
