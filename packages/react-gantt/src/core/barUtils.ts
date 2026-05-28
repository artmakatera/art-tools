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

function pxToDate(pxOffset: number, origin: Date, colWidth: number): Date {
  return new Date(origin.getTime() + (pxOffset / colWidth) * MS_PER_DAY);
}

function pxToDateSnapped(
  pxOffset: number,
  origin: Date,
  colWidth: number,
): Date {
  return addDays(origin, Math.round(pxOffset / colWidth));
}

export interface PixelPatch {
  left?: number;
  width?: number;
  progress?: number;
}

export function applyPixelPatch(
  task: GanttTask,
  prevOverride: Partial<TaskState>,
  patch: PixelPatch,
  origin: Date,
  colWidth: number,
): Partial<TaskState> {
  return buildOverride(task, prevOverride, patch, origin, colWidth, pxToDate);
}

function buildOverride(
  task: GanttTask,
  prevOverride: Partial<TaskState>,
  patch: PixelPatch,
  origin: Date,
  colWidth: number,
  toDate: (px: number, origin: Date, cw: number) => Date,
): Partial<TaskState> {
  const next: Partial<TaskState> = { ...prevOverride };
  if (patch.progress !== undefined) next.progress = patch.progress;
  if (patch.left === undefined && patch.width === undefined) return next;

  const isMilestone = task.type === "milestone";

  if (patch.width !== undefined) {
    const base = computeTaskPixels(task, prevOverride, origin, colWidth);
    const newLeft = patch.left ?? base.left;
    next.startDate = toDate(newLeft, origin, colWidth);
    if (!isMilestone) {
      next.endDate = toDate(
        newLeft + patch.width - colWidth,
        origin,
        colWidth,
      );
    }
    return next;
  }

  if (patch.left !== undefined) {
    const newStart = toDate(patch.left, origin, colWidth);
    next.startDate = newStart;
    if (!isMilestone) {
      const prevStart = prevOverride.startDate ?? task.startDate;
      const prevEnd = prevOverride.endDate ?? task.endDate ?? prevStart;
      const duration = prevEnd.getTime() - prevStart.getTime();
      next.endDate = new Date(newStart.getTime() + duration);
    }
  }
  return next;
}

interface Position {
  left: number;
  width: number;
}

export interface CommitTaskStateInput {
  task: GanttTask;
  origin: Date;
  colWidth: number;
  dataCols: number;
  prevOverride: Partial<TaskState>;
  prevPadLeft: number;
  prevPadRight: number;
  patch: PixelPatch;
  isResize: boolean;
}

export interface CommitTaskStateOutput {
  override: Partial<TaskState>;
  padLeft: number;
  padRight: number;
}

export function commitTaskState({
  task,
  origin,
  colWidth,
  dataCols,
  prevOverride,
  prevPadLeft,
  prevPadRight,
  patch,
  isResize,
}: CommitTaskStateInput): CommitTaskStateOutput {
  const base = computeTaskPixels(task, prevOverride, origin, colWidth);
  const candidate: Position = {
    left: patch.left ?? base.left,
    width: patch.width ?? base.width,
  };

  const afterLeft = extendForLeftOverflow(
    candidate,
    prevPadLeft,
    colWidth,
    isResize,
  );
  const afterRight = extendForRightOverflow(
    afterLeft.position,
    prevPadRight,
    dataCols,
    colWidth,
    isResize,
  );

  const override = buildOverride(
    task,
    prevOverride,
    {
      left: afterRight.position.left,
      width: afterRight.position.width,
      progress: patch.progress,
    },
    origin,
    colWidth,
    pxToDateSnapped,
  );

  return {
    override,
    padLeft: afterLeft.padLeft,
    padRight: afterRight.padRight,
  };
}

function extendForLeftOverflow(
  position: Position,
  padLeft: number,
  colWidth: number,
  isResize: boolean,
): { position: Position; padLeft: number } {
  const minLeft = -padLeft * colWidth;
  if (position.left > minLeft) {
    return { position, padLeft };
  }
  const newMin = -(padLeft + 1) * colWidth;
  return {
    position: {
      left: newMin,
      width: isResize
        ? position.left + position.width - newMin
        : position.width,
    },
    padLeft: padLeft + 2,
  };
}

function extendForRightOverflow(
  position: Position,
  padRight: number,
  dataCols: number,
  colWidth: number,
  isResize: boolean,
): { position: Position; padRight: number } {
  const maxRight = (dataCols + padRight) * colWidth;
  if (position.left + position.width < maxRight) {
    return { position, padRight };
  }
  const newMax = (dataCols + padRight + 1) * colWidth;
  return {
    position: {
      left: isResize ? position.left : newMax - position.width,
      width: isResize ? newMax - position.left : position.width,
    },
    padRight: padRight + 2,
  };
}
