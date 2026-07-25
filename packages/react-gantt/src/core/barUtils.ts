import type { CalendarUnit, GanttTask, TaskState } from "../types";

const MS_PER_DAY = 86_400_000;

const MS_PER_UNIT: Record<CalendarUnit, number> = {
  minute: 60_000,
  hour: 3_600_000,
  day: MS_PER_DAY,
  week: MS_PER_DAY * 7,
  month: MS_PER_DAY * 30, // approximate
  quarter: MS_PER_DAY * 91, // approximate
  year: MS_PER_DAY * 365, // approximate
};


function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

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
  const msPerUnit = MS_PER_UNIT[unit];
  let startDate = override.startDate ?? startOfDay(task.startDate);
  let endDate =
    override.endDate ?? (task.endDate ? startOfDay(task.endDate) : startDate);
  // if (options?.snapToDay) {
  //   startDate = startOfDay(startDate);
  //   endDate = startOfDay(endDate);
  // }
  const left =
    ((startDate.getTime() - origin.getTime()) / msPerUnit) * colWidth;
  const width =
    ((endDate.getTime() - startDate.getTime()) / msPerUnit + 1) * colWidth;

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
  return new Date(origin.getTime() + (pxOffset / colWidth) * MS_PER_UNIT[unit]);
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

