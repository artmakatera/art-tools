import type { CalendarUnit, GanttTask, TaskState } from "../types";
import { dateAtOffset, startOfUnit, unitOffset } from "./dateUtils";

const MS_PER_DAY = 86_400_000;

export interface TaskPixels {
  left: number;
  width: number;
  progress: number;
}

export function computeTaskPixels(
  task: GanttTask,
  override: Partial<TaskState> = {},
  origin: Date,
  colWidth: number,
  unit: CalendarUnit = "day",
  // Accepted but not yet honoured: bars are always positioned by their true
  // day-granular dates (see the comment below). Callers already pass it, so the
  // parameter stays to keep the signature stable for when snapping lands.
  _options?: { snapToDay?: boolean },
): TaskPixels {
  // Position by the task's true (day-granular) dates rather than snapping to the
  // column unit, so a bar's size is proportional to its real duration. The bar
  // fills through the END of endDate's day, so the right edge is measured at the
  // exclusive next day. At a coarse unit (e.g. quarter) a one-day task is then a
  // thin sliver — 1/90th of a column — not a whole column.
  const startDate = override.startDate ?? startOfUnit(task.startDate, "day");
  const endDate =
    override.endDate ?? (task.endDate ? startOfUnit(task.endDate, "day") : startDate);
  const startOff = unitOffset(origin, startDate, unit);
  const endOff = unitOffset(origin, new Date(endDate.getTime() + MS_PER_DAY), unit);
  const left = startOff * colWidth;
  const width = (endOff - startOff) * colWidth;

  return {
    left,
    width,
    progress: override.progress ?? task.progress ?? 0,
  };
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
  return new Date(
    pxToDate(rightEdgePx, origin, colWidth, unit).getTime() - MS_PER_DAY,
  );
}

export interface DatePatch {
  startDate?: Date;
  endDate?: Date;
  progress?: number;
}

export function applyPatch(
  task: GanttTask,
  prevOverride: Partial<TaskState>,
  patch: DatePatch,
): Partial<TaskState> {
  const next: Partial<TaskState> = { ...prevOverride };
  if (patch.progress !== undefined) next.progress = patch.progress;

  const isMilestone = task.type === "milestone";

  if (patch.endDate !== undefined) {
    if (patch.startDate !== undefined) next.startDate = patch.startDate;
    if (!isMilestone) next.endDate = patch.endDate;
    return next;
  }

  if (patch.startDate !== undefined) {
    next.startDate = patch.startDate;
    if (!isMilestone) {
      const prevStart = prevOverride.startDate ?? task.startDate;
      const prevEnd = prevOverride.endDate ?? task.endDate ?? prevStart;
      const duration = prevEnd.getTime() - prevStart.getTime();
      next.endDate = new Date(patch.startDate.getTime() + duration);
    }
  }
  return next;
}

