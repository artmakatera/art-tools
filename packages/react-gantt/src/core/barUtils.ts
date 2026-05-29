import type { CalendarUnit, GanttTask, Scale, TaskState } from "../types";
import { addDays } from "./dateUtils";

const MS_PER_DAY = 86_400_000;

const UNIT_RANK: Record<CalendarUnit, number> = {
  day: 0,
  week: 1,
  month: 2,
  quarter: 3,
  year: 4,
};

export function getFinestUnit(scales: Scale[] | undefined): CalendarUnit {
  const first = scales?.[0];
  if (!first) return "day";
  return scales.reduce<CalendarUnit>(
    (finest, s) => (UNIT_RANK[s.unit] < UNIT_RANK[finest] ? s.unit : finest),
    first.unit,
  );
}

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
  override: Partial<TaskState>,
  origin: Date,
  colWidth: number,
  options?: { snapToDay?: boolean },
): TaskPixels {
  let startDate = override.startDate ?? startOfDay(task.startDate);
  let endDate =
    override.endDate ?? (task.endDate ? startOfDay(task.endDate) : startDate);
  if (options?.snapToDay) {
    startDate = startOfDay(startDate);
    endDate = startOfDay(endDate);
  }
  const left =
    ((startDate.getTime() - origin.getTime()) / MS_PER_DAY) * colWidth;
  const width =
    ((endDate.getTime() - startDate.getTime()) / MS_PER_DAY + 1) * colWidth;
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
): Date {
  return new Date(origin.getTime() + (pxOffset / colWidth) * MS_PER_DAY);
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

export interface CommitTaskStateInput {
  task: GanttTask;
  prevOverride: Partial<TaskState>;
  prevPadLeft: number;
  prevPadRight: number;
  minStartDate: Date;
  maxEndDate: Date;
  patch: DatePatch;
  isResize: boolean;
}

export interface CommitTaskStateOutput {
  override: Partial<TaskState>;
  padLeft: number;
  padRight: number;
}

export function commitTaskState({
  task,
  prevOverride,
  prevPadLeft,
  prevPadRight,
  minStartDate,
  maxEndDate,
  patch,
  isResize,
}: CommitTaskStateInput): CommitTaskStateOutput {
  const baseOverride = applyPatch(task, prevOverride, patch);
  const positional =
    patch.startDate !== undefined || patch.endDate !== undefined;

  if (!positional) {
    return {
      override: baseOverride,
      padLeft: prevPadLeft,
      padRight: prevPadRight,
    };
  }

  const isMilestone = task.type === "milestone";
  let cStart = baseOverride.startDate ?? task.startDate;
  let cEnd = isMilestone
    ? cStart
    : (baseOverride.endDate ?? task.endDate ?? cStart);

  let padLeft = prevPadLeft;
  let padRight = prevPadRight;

  if (cStart < minStartDate) {
    const newStart = addDays(minStartDate, -1);
    const delta = newStart.getTime() - cStart.getTime();
    cStart = newStart;
    if (!isResize) {
      cEnd = new Date(cEnd.getTime() + delta);
    }
    padLeft += 2;
  }

  if (cEnd > maxEndDate) {
    const newEnd = addDays(maxEndDate, 1);
    const delta = newEnd.getTime() - cEnd.getTime();
    cEnd = newEnd;
    if (!isResize) {
      cStart = new Date(cStart.getTime() + delta);
    }
    padRight += 2;
  }

  const override: Partial<TaskState> = { ...baseOverride, startDate: cStart };
  if (!isMilestone) override.endDate = cEnd;

  return { override, padLeft, padRight };
}
