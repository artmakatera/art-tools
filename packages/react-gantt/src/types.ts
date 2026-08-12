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
  ariaFormat?: (date: Date) => string;
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
  /** Resolved accessible strings, for labelling controls a column renders.
   *  `ColumnDef.render` is a plain function, not a component, so it can't call
   *  `useGanttLabels()` — this is its channel to the `labels` prop. */
  labels: ResolvedGanttLabels;
}

/**
 * Overrides for every accessible string the library emits. Pass any subset via
 * `<Gantt labels={...} />`; omitted keys keep their English defaults (see
 * `DEFAULT_LABELS` in `core/labels.ts`).
 *
 * NOTE: pass a referentially stable / memoized object — a fresh object each render
 * invalidates the labels context and re-renders every row and bar.
 */
export interface GanttLabels {
  /** Accessible name for the whole widget. Default: `"Gantt chart"`. */
  gantt?: string;
  /** Accessible name for the task-list treegrid. Default: `"Task list"`. */
  taskList?: string;
  /** Accessible name for the timeline grid. Default: `"Timeline"`. */
  timeline?: string;
  /** Expand toggle, collapsed state. Default: `"Expand"`. */
  expand?: string;
  /** Expand toggle, expanded state. Default: `"Collapse"`. */
  collapse?: string;
  /** The task-list / timeline splitter. Default: `"Resize task list"`. */
  resizeTaskList?: string;
  /** The dependency-link delete button. Default: `"Delete dependency"`. */
  deleteDependency?: string;
  /** Actions-column edit button. Default: `` `Edit ${task.name}` ``. */
  editTask?: (task: GanttTask) => string;
  /** Actions-column insert button. Default: `` `Add task after ${task.name}` ``. */
  addTaskAfter?: (task: GanttTask) => string;
  /** Actions-column delete button. Default: `` `Delete ${task.name}` ``. */
  deleteTask?: (task: GanttTask) => string;
  /**
   * The single announcement for a timeline bar. The bar's inner subtree is
   * `aria-hidden`, so this must carry everything the bar shows visually.
   * Default: `"{name}, {type}, {start} to {end}, {progress}% complete"`.
   */
  bar?: (task: GanttTask, state: { progress: number }) => string;
}

/** `GanttLabels` with every key filled in from the defaults. */
export type ResolvedGanttLabels = Required<GanttLabels>;

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
  /**
   * Overrides for the library's accessible strings (screen-reader names).
   * Pass a referentially stable object — see `GanttLabels`.
   */
  labels?: GanttLabels;
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