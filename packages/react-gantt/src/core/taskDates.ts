import type { DurationUnit, GanttTask } from "../types";
import type { ResolvedCalendar } from "./calendar";
import { startOfUnit } from "./dateUtils";
import { addWorkingUnits } from "./workingTime";

/**
 * Everything outside a task that its dates depend on. Threaded explicitly through
 * `core/*` rather than read from context, so every function here stays a pure
 * unit-testable function with no React and no module state.
 */
export interface SchedulingContext {
  /** `null` means no calendar prop: plain linear time, exactly as before this feature. */
  calendar: ResolvedCalendar | null;
  durationUnit: DurationUnit;
  /** Whether library-authored dates snap onto working time (ADR-012). */
  snapToWorking: boolean;
}

/** The context a chart has with no `calendar` prop — linear time (ADR-002). */
export const LINEAR_CONTEXT: SchedulingContext = {
  calendar: null,
  durationUnit: "day",
  snapToWorking: true,
};

/**
 * The instant a task stops — **exclusive** (ADR-014). A Monday-to-Friday all-day
 * task ends at Saturday 00:00; a 9-to-5 Friday task ends at Friday 17:00.
 *
 * Precedence, preserving what `getEndDate` used to do: an explicit `endDate` wins,
 * else `duration` is walked out in working time on the chart's `durationUnit`,
 * else the task is an instant.
 *
 * A milestone or a zero duration is always an instant (ADR-009): a moment in time,
 * exempt from any duration basis.
 */
export function endInstantOf(task: GanttTask, ctx: SchedulingContext): Date {
  if (task.type === "milestone" || task.duration === 0) {
    return task.startDate;
  }
  if (task.endDate) {
    return task.endDate;
  }
  if (task.duration === undefined) {
    return task.startDate;
  }
  return addWorkingUnits(ctx.calendar, task.startDate, task.duration, ctx.durationUnit, 1);
}

/**
 * The inclusive last-occupied civil day, for **display only**.
 *
 * Stored dates are exclusive instants, which reads wrong in a column: a task
 * running Monday through Friday stores Saturday. This converts back for humans —
 * the day containing the last worked moment. Never write the result back to a task.
 */
export function displayEndDate(startDate: Date, endInstant: Date): Date {
  if (endInstant.getTime() <= startDate.getTime()) {
    return startOfUnit(startDate, "day");
  }
  return startOfUnit(new Date(endInstant.getTime() - 1), "day");
}

/**
 * Inverse of {@link displayEndDate} for a whole-day edit: the exclusive instant
 * starting the day after `displayEnd`.
 *
 * This is what a `<input type="date">` end-date editor needs — the user picks the
 * last day they mean, and the task stores the following midnight.
 */
export function endInstantFromDisplayDate(displayEnd: Date): Date {
  return new Date(displayEnd.getFullYear(), displayEnd.getMonth(), displayEnd.getDate() + 1);
}
