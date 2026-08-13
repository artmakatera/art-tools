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

/**
 * A span of working hours within one day, `"H:MM-H:MM"` in local civil time with
 * minute precision — e.g. `"8:30-12:00"`. Half-open: the end minute is the first
 * non-working minute. `"24:00"` is legal only as an end.
 */
export type WorkTimeRange = string;

/**
 * Working hours for a single day, or `false` for a day off. Gaps *between*
 * ranges are non-working — that is how a lunch break is expressed:
 * `["8:00-12:00", "13:00-17:00"]`.
 */
export type DayHours = WorkTimeRange[] | false;

/** `0` = Sunday … `6` = Saturday, matching `Date.prototype.getDay`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * The chart's working-time calendar. Three scopes resolve in the order
 * `dates` → `days` → `hours`, so a specific date beats a weekday rule, which
 * beats the global default.
 *
 * Passing a calendar at all is the opt-in: with no `calendar` prop the chart
 * schedules in plain linear time exactly as it did before this feature existed.
 *
 * The object may be written inline — it is keyed by content, not identity, so a
 * fresh-but-equal object on every render costs nothing.
 */
export interface GanttCalendar {
  /**
   * Working hours for every day with no override below. Omitted means the
   * *full* day (`"0:00-24:00"`), so a calendar that only lists weekend days off
   * stays day-granular rather than silently acquiring business hours.
   */
  hours?: DayHours;
  /** Per-weekday override. Beats {@link GanttCalendar.hours}. */
  days?: Partial<Record<Weekday, DayHours>>;
  /**
   * Per-date override keyed by local civil date, `"YYYY-MM-DD"`. Beats both
   * {@link GanttCalendar.days} and {@link GanttCalendar.hours}. Use it for
   * holidays (`false`), half days, or a one-off working Saturday.
   */
  dates?: Record<string, DayHours>;
}

/** The unit an input `duration` is expressed in, and the unit it displays in. */
export type DurationUnit = "day" | "hour" | "minute";


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
  /**
   * Display helpers that already know the chart's calendar and `durationUnit` —
   * the same channel as `labels`, for the same reason.
   *
   * Stored dates are exclusive instants, which read wrong in a column: a task
   * running Monday to Friday stores Saturday. Use these to show a user-facing
   * end date or duration rather than formatting `task.endDate` directly.
   */
  format: {
    /** The inclusive last-occupied day, or `undefined` for an instant. */
    endDate: (task: GanttTask) => Date | undefined;
    /** Working time the task occupies, in the chart's `durationUnit`. */
    duration: (task: GanttTask) => number;
  };
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
  /**
   * Working-time calendar. Supplying it is the opt-in: with no `calendar` the
   * chart schedules in plain linear time exactly as before. Safe to write inline —
   * it is keyed by content, not identity.
   */
  calendar?: GanttCalendar;
  /**
   * Snap library-authored dates (drag commits, cascade results) onto working
   * time. Defaults to `true` when a `calendar` is supplied; `false` keeps the
   * non-working shading but leaves dates untouched.
   */
  snapToWorking?: boolean;
  /** How an input `duration` is interpreted and displayed. Defaults to `"day"`. */
  durationUnit?: DurationUnit;
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