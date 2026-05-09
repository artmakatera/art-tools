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