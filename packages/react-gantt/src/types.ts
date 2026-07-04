import type React from "react";

type GanttTaskType = "task" | "milestone" | "project"

export type CalendarUnit = "day" | "week" | "month" | "quarter" | "year";


export type Scale = {
  unit: CalendarUnit;
  step: number;
  format: (date: Date) => string;
};

export type Id = string | number;


export interface GanttTask {
  id: Id;
  name: string;

  startDate: Date;
  endDate?: Date;
  duration?: number;
  progress?: number;
  type?: GanttTaskType;
  parentId?: Id | null;

}


export interface ColumnDef<T extends GanttTask = GanttTask> {
  key: string;
  header: string;
  width?: number;
  render: (task: T, api: ColumnApi) => React.ReactNode;
  isTreeColumn?: boolean;

}

/** Patch passed to the imperative `updateTask`; only the provided fields change. */
export interface TaskPatch {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  progress?: number;
}

/** Imperative API exposed via `<Gantt apiRef={ref} />` for create/update/delete/undo/redo. */
export interface GanttHandle {
  createTask: (task: GanttTask, afterId?: Id | null) => void;
  updateTask: (id: Id, patch: TaskPatch) => void;
  deleteTask: (id: Id) => void;
  undo: () => void;
  redo: () => void;
  /** Scroll the task list vertically to reveal a task, auto-expanding any
   *  collapsed ancestors first. No-op for an unknown id. */
  scrollToTask: (id: Id) => void;
}

/** API passed as the 2nd arg to `ColumnDef.render`, for building actionable columns. */
export interface ColumnApi extends GanttHandle {
  /** Fires the consumer's `onTaskEdit` callback for this task. */
  editTask: (task: GanttTask) => void;
}

export interface GanttProps {
  tasks: GanttTask[];
  rowHeight?: number;
  colWidth?: number;
  /** Total component height in px. When set, rows scroll vertically within it
   *  (calendar/header stay pinned); omit to grow with content. */
  height: number;
  scales?: Scale[];
  padDays?: number;
  onTaskClick?: (task: GanttTask) => void;
  dependencies?: TaskDependency[];
  columns?: ColumnDef[];
  defaultTaskListWidth?: number;
  onDependencyCreate?: (dep: TaskDependency) => void;
  onDependencyDelete?: (dep: TaskDependency) => void;
  onTaskCreate?: (task: GanttTask, afterId?: Id | null) => void;
  onTaskDelete?: (id: Id) => void;
  /** Fired when a column's edit action is invoked (e.g. the actions-column pencil button). */
  onTaskEdit?: (task: GanttTask) => void;
  /** Fired with the resolved task list whenever it changes (after create/delete/edit/undo/redo). */
  onTasksChange?: (tasks: GanttTask[]) => void;
  /** Receives the imperative API: `apiRef.current.createTask(...)`, `.undo()`, etc. */
  apiRef?: React.Ref<GanttHandle>;
  hideTaskList?: boolean;
}



export interface TaskState {
  startDate: Date;
  endDate?: Date;
  progress: number;
}


export type Overrides = Record<Id, Partial<TaskState>>;

export type TaskCommand =
  | { type: "create"; task: GanttTask; afterId?: Id | null } // null/undefined = append at end
  | { type: "update"; task: GanttTask }
  | { type: "delete"; id: Id };

/**
 * Globally-ordered change history. Each user action is one transaction
 * (an array of commands), so a drag plus its cascaded reschedules undo as a
 * single step. `cursor` is how many transactions are currently applied —
 * undo decrements it, redo increments it.
 */
export interface ChangeLog {
  transactions: TaskCommand[][];
  cursor: number;
}


export type TaskDependencyType = "FS" | "FF" | "SS" | "SF";


export type TaskDependency = {
  from: Id;
  to: Id;
  type: TaskDependencyType;
  lag?: number;
}