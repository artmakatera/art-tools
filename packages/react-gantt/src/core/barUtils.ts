import type { GanttTask, TaskState } from "../types";
import { diffDays } from "./dateUtils";

export function computeTaskState(
  task: GanttTask,
  origin: Date,
  colWidth: number,
): TaskState {
  const startOffset = diffDays(origin, task.startDate);
  const endDate = task.endDate ?? task.startDate;
  const span = Math.max(1, diffDays(task.startDate, endDate) + 1);
  return {
    left: startOffset * colWidth,
    width: span * colWidth,
    progress: task.progress ?? 0,
  };
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
  patch: Partial<TaskState>;
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
  const base = computeTaskState(task, origin, colWidth);
  const candidate: Position = {
    left: patch.left ?? prevOverride.left ?? base.left,
    width: patch.width ?? prevOverride.width ?? base.width,
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

  return {
    override: { ...prevOverride, ...patch, ...afterRight.position },
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
