import type { CalendarUnit, GanttTask, TaskState } from "../types";
import { dateAtOffset, startOfUnit, unitOffset } from "./dateUtils";

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
  options?: { snapToDay?: boolean },
): TaskPixels {
  // Task dates are snapped to the column unit, so a task fills the whole columns
  // it touches; the "+1 column" keeps a single-unit task exactly one column wide.
  const startDate = override.startDate ?? startOfUnit(task.startDate, unit);
  const endDate =
    override.endDate ?? (task.endDate ? startOfUnit(task.endDate, unit) : startDate);
  const startOff = unitOffset(origin, startDate, unit);
  const endOff = unitOffset(origin, endDate, unit);
  const left = startOff * colWidth;
  const width = (endOff - startOff + 1) * colWidth;

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

