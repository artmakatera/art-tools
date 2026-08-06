import type React from "react";
import type {
  GanttTaskListSlots,
  GanttBarsSlots,
  GanttDependenciesSlots,
  GanttTimelineSlots,
} from "./context/GanttSlotsContext";
import type { ZoomLevel } from "./core/zoom";

type GanttTaskType = "task" | "milestone" | "summary"

export type CalendarUnit = "minute" | "hour" |"day" | "week" | "month" | "quarter" | "year";


export type Scale = {
  unit: CalendarUnit;
  step: number;
  format: (date: Date) => string;
};

export type Id = string | number;

/** Which of the two coordinated treegrids a focus target belongs to. */
export type GanttPane = "list" | "grid";

/**
 * Which element within a row is the roving tab stop. `startHandle`/`endHandle`
 * are only ever current while a keyboard dependency link is being drawn.
 */
export type GanttFocusSlot = "row" | "bar" | "startHandle" | "endHandle";

/**
 * The keyboard cursor. Identified by task id rather than row index, because
 * indices are invalidated by collapsing a branch, deleting a task, or any
 * change to the `tasks` prop — while the id survives all three.
 */
export interface GanttFocusTarget {
  pane: GanttPane;
  taskId: Id;
  slot: GanttFocusSlot;
}

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
  /** Step the zoom ladder one level finer. No-op at the finest level. */
  zoomIn: () => void;
  /** Step the zoom ladder one level coarser. No-op at the coarsest level. */
  zoomOut: () => void;
  /** Jump to a zoom-ladder index (clamped to the ladder bounds). */
  setZoom: (index: number) => void;
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
  /** Custom zoom ladder (coarse → fine). Defaults to the built-in ladder; when
   *  omitted, `scales`/`colWidth` seed the default rung. */
  zoomLevels?: ZoomLevel[];
  /** Starting rung of the zoom ladder (default: the month/day level). */
  defaultZoomIndex?: number;
  /** Fired when the zoom level changes (and once on mount). */
  onZoomChange?: (state: { index: number; count: number }) => void;
  /** Enable Ctrl/Cmd + mouse-wheel zoom over the grid (anchors on the cursor). */
  zoomWheel?: boolean;
  /** Enable +/- keyboard zoom when the grid is focused. */
  zoomKeyboard?: boolean;
  /**
   * Allow the keyboard to *modify* tasks from the timeline pane: arrow keys
   * nudge a bar by one column, Shift/Alt + arrows resize its end/start edge, and
   * Enter starts a dependency link. Off by default — a read-only chart must not
   * reschedule itself because a stray arrow key landed in it.
   *
   * ARIA roles and keyboard *navigation* are always on and are not gated here.
   */
  keyboardEditing?: boolean;
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
  /**
   * Slot overrides for the task-list pane (`treeCell`, `header`). Prop-drilled.
   * Pass a referentially stable object — rows are memoized, so a fresh object each
   * render re-renders every row.
   */
  taskList?: GanttTaskListSlots;
  /** Slot overrides for the timeline bars and their handles. */
  bars?: GanttBarsSlots;
  /** Slot overrides for dependency links (named `dependencySlots` to avoid
   *  colliding with the `dependencies` data prop above). */
  dependencySlots?: GanttDependenciesSlots;
  /** Slot overrides for the calendar/grid timeline chrome. */
  timeline?: GanttTimelineSlots;
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