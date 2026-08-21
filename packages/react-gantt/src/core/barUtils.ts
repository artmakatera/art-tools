import type { CalendarUnit, GanttTask, TaskState } from "../types";
import { dateAtOffset, unitOffset } from "./dateUtils";

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
): TaskPixels {
  // Position by the task's true instants, never snapped to the column unit, so a
  // bar's size is proportional to its real duration. `endDate` is exclusive
  // (ADR-014), so it IS the right edge — no +1 day fudge. At a coarse unit (e.g.
  // quarter) a one-day task is a thin sliver, 1/90th of a column, not a whole one.
  //
  // The display list materializes `endDate` on every task (ADR-019), so the
  // fallback here only covers a task rendered straight from consumer data.
  const startDate = override.startDate ?? task.startDate;
  const endDate = override.endDate ?? task.endDate ?? startDate;
  const startOff = unitOffset(origin, startDate, unit);
  const endOff = unitOffset(origin, endDate, unit);
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

export interface DatePatch {
  startDate?: Date;
  endDate?: Date;
  progress?: number;
}

/**
 * What a finished drag *meant*, rather than the two dates it happened to land on.
 *
 * The preview stays rigid and pixel-derived (ADR-008), so pixel width during a
 * drag is preview state, not intent — a move that crosses a weekend must preserve
 * the task's working time, which the pixels cannot express. Emitting an intent and
 * resolving it once on drop is what keeps every calendar read out of the mousemove
 * path by construction.
 */
export type BarCommit =
  /** Whole bar dropped with its left edge here; the end is re-derived. */
  | { kind: "move"; startDate: Date }
  /** Start edge dragged here; the end is pinned. */
  | { kind: "resizeStart"; startDate: Date }
  /** End edge dragged here; the start is pinned. */
  | { kind: "resizeEnd"; endDate: Date };
