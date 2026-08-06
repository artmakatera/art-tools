import type { CalendarUnit, GanttTask, TaskState } from "../types";
import { addDays, dateAtOffset, getEndDate, startOfUnit, unitOffset } from "./dateUtils";

const MS_PER_DAY = 86_400_000;

export interface TaskPixels {
  left: number;
  width: number;
  progress: number;
}

/** A task's day-granular start/end/progress with any drag override applied. */
export interface EffectiveTaskDates {
  startDate: Date;
  endDate: Date;
  progress: number;
}

/**
 * Resolve what a task currently *is*, folding in an in-flight drag override.
 *
 * Shared by the geometry and by the bar's accessible name so the two can never
 * describe different spans. `duration` is honoured through {@link getEndDate};
 * a task with neither `endDate` nor `duration` collapses onto its start day.
 */
export function resolveTaskDates(
  task: GanttTask,
  override: Partial<TaskState> = {},
): EffectiveTaskDates {
  const startDate = override.startDate ?? startOfUnit(task.startDate, "day");
  const hasExplicitEnd = task.endDate != null || task.duration != null;
  const endDate =
    override.endDate ??
    (hasExplicitEnd
      ? startOfUnit(getEndDate(task.startDate, task.endDate, task.duration), "day")
      : startDate);
  return { startDate, endDate, progress: override.progress ?? task.progress ?? 0 };
}

export function computeTaskPixels(
  task: GanttTask,
  override: Partial<TaskState> = {},
  origin: Date,
  colWidth: number,
  unit: CalendarUnit = "day",
  options?: { snapToDay?: boolean },
): TaskPixels {
  // Position by the task's true (day-granular) dates rather than snapping to the
  // column unit, so a bar's size is proportional to its real duration. The bar
  // fills through the END of endDate's day, so the right edge is measured at the
  // exclusive next day. At a coarse unit (e.g. quarter) a one-day task is then a
  // thin sliver — 1/90th of a column — not a whole column.
  const { startDate, endDate, progress } = resolveTaskDates(task, override);
  const startOff = unitOffset(origin, startDate, unit);
  const endOff = unitOffset(origin, new Date(endDate.getTime() + MS_PER_DAY), unit);
  const left = startOff * colWidth;
  const width = (endOff - startOff) * colWidth;

  return { left, width, progress };
}

export function pxToDate(
  pxOffset: number,
  origin: Date,
  colWidth: number,
  unit: CalendarUnit = "day",
): Date {
  return dateAtOffset(origin, unit, pxOffset / colWidth);
}

/**
 * Inclusive end date whose bar right-edge lands at `rightEdgePx`. Inverse of the
 * {@link computeTaskPixels} width convention: the bar fills through the end of
 * endDate's day, so the stored endDate is the day before the exclusive edge.
 */
export function pxToEndDate(
  rightEdgePx: number,
  origin: Date,
  colWidth: number,
  unit: CalendarUnit = "day",
): Date {
  // Step the calendar day rather than subtracting 24h: across a spring-forward
  // boundary the raw subtraction lands on the previous day at 23:00, silently
  // shortening the bar by a day.
  return addDays(pxToDate(rightEdgePx, origin, colWidth, unit), -1);
}

export interface DatePatch {
  startDate?: Date;
  endDate?: Date;
  progress?: number;
}


