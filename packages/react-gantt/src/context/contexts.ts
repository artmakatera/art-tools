import { createContext, useContext } from "react";
import type {
  ColumnApi,
  GanttTask,
  Id,
  ResolvedGanttLabels,
  Scale,
  TaskDependency,
} from "../types";
import { LINEAR_CONTEXT, type SchedulingContext } from "../core/taskDates";
import { DEFAULT_LABELS } from "../core/labels";
import type { ViewportMetrics } from "../hooks/useScrollSync";
import type { ConnectorHandle, DependencyDragState } from "../hooks/useDependencyDrag";
import type { BarCommit, DatePatch } from "../core/barUtils";
import type { RevealOptions } from "../hooks/useRevealTask";

export type { ConnectorHandle, DependencyDragState } from "../hooks/useDependencyDrag";

/**
 * Every Gantt context object and its consumer hook.
 *
 * Kept in one file on purpose: the value of the split is being able to see all
 * twelve boundaries and the cadence table below at a glance. Splitting further,
 * one file per context, would hide exactly the thing this design needs reviewed
 * together.
 *
 * The provider that supplies these lives in `GanttProvider.tsx`; nothing here
 * imports it, so a component may depend on a context without pulling in the
 * whole composition root.
 */

// Contexts are split by update frequency so high-frequency state (drag
// position, viewport, selection) never invalidates consumers that only need
// stable references. Rough cadence, hottest first:
//   drag position  → every drag-move frame   (DependencyPreview only)
//   viewport       → every scroll frame      (Grid only)
//   selection      → per click               (TaskList only)
//   task state     → per edit/expand         (Grid, TaskList)
//   everything else is identity-stable across those updates.

// --- Config ---------------------------------------------------------------

export interface GanttConfigValue {
  rowHeight: number;
  colWidth: number;
  scales?: Scale[];
  padDays: number;
  /** Total component height in px; undefined = grow with content. */
  height?: number;
}

export const GanttConfigContext = createContext<GanttConfigValue | null>(null);

export function useGanttConfig(): GanttConfigValue {
  const ctx = useContext(GanttConfigContext);
  if (!ctx) {
    throw new Error("useGanttConfig must be used within a <GanttProvider>");
  }
  return ctx;
}

// --- Labels ---------------------------------------------------------------

// Kept out of the config context on purpose: config churns on every zoom step,
// while labels only change when the consumer's `labels` prop does. Bars and rows
// are memoized and read this directly, so it has to stay identity-stable.
//
// Unlike the other contexts this one does NOT throw without a provider: labels are
// presentational defaults, not required wiring, so sub-components stay renderable
// on their own (which is how the slot tests exercise them).
export const GanttLabelsContext = createContext<ResolvedGanttLabels>(DEFAULT_LABELS);

export function useGanttLabels(): ResolvedGanttLabels {
  return useContext(GanttLabelsContext);
}

// --- Working-time calendar ------------------------------------------------

// Kept out of the config context on purpose: config churns on every zoom step,
// while the calendar changes only when the consumer's prop does — and it is a
// dependency of the task-list memo, so it must stay identity-stable.
//
// Like the labels context this does NOT throw without a provider: `GridColumns`
// and `CalendarRow` are rendered bare by the slot tests, and a chart with no
// calendar is the normal case anyway.
export const GanttCalendarContext = createContext<SchedulingContext>(LINEAR_CONTEXT);

export function useGanttWorkCalendar(): SchedulingContext {
  return useContext(GanttCalendarContext);
}

// --- Read-only ------------------------------------------------------------

// Primitive context, its own provider because it is read by memoized leaves
// (bars, connector handles, links) and must not ride along with anything that
// churns. Like labels it does NOT throw without a provider: `false` — fully
// interactive — is the historical default, which is what keeps sub-components
// renderable bare in the slot tests.
export const GanttReadOnlyContext = createContext<boolean>(false);

export function useGanttReadOnly(): boolean {
  return useContext(GanttReadOnlyContext);
}

// --- Task state -----------------------------------------------------------

export interface GanttTaskStateValue {
  tasksList: GanttTask[];
  visibleTasks: GanttTask[];
  expandedIds: Set<Id>;
  parentIds: Set<Id>;
  canUndo: boolean;
  canRedo: boolean;
}

export const GanttTaskStateContext = createContext<GanttTaskStateValue | null>(null);

export function useGanttTaskState(): GanttTaskStateValue {
  const ctx = useContext(GanttTaskStateContext);
  if (!ctx) {
    throw new Error("useGanttTaskState must be used within a <GanttProvider>");
  }
  return ctx;
}

// --- Task actions ---------------------------------------------------------

// Everything here is identity-stable except `updateTask`/`columnApi`, which
// only change when the `dependencies` prop changes — so per-row consumers
// (TaskListRow) can rely on memoization.
export interface GanttTaskActionsValue {
  updateTask: (id: Id, patch: DatePatch) => void;
  /** Commit a finished drag as an intent; the only path that snaps to working time. */
  commitTask: (id: Id, commit: BarCommit) => void;
  createTask: (task: GanttTask, afterId?: Id | null) => void;
  deleteTask: (id: Id) => void;
  undo: () => void;
  redo: () => void;
  /** API handed to `ColumnDef.render` so columns can mutate/edit tasks. */
  columnApi: ColumnApi;
  setSelectedId: (id: Id | null) => void;
  toggleExpand: (id: Id) => void;
  onTaskClick?: (task: GanttTask) => void;
  /** Bring a task into view. See `GanttHandle.revealTask`. */
  revealTask: (id: Id, options?: RevealOptions) => void;
}

export const GanttTaskActionsContext = createContext<GanttTaskActionsValue | null>(null);

export function useGanttTaskActions(): GanttTaskActionsValue {
  const ctx = useContext(GanttTaskActionsContext);
  if (!ctx) {
    throw new Error("useGanttTaskActions must be used within a <GanttProvider>");
  }
  return ctx;
}

// --- Selection ------------------------------------------------------------

// Primitive context (no null-throw pattern: `null` is a valid value, meaning
// "nothing selected"). The setter lives in the actions context.
export const GanttSelectionContext = createContext<Id | null>(null);

export function useGanttSelectedId(): Id | null {
  return useContext(GanttSelectionContext);
}

// --- Scroll ---------------------------------------------------------------

// Refs and handlers only — all identity-stable, so this context never
// re-renders its consumers. Viewport metrics live in their own context below.
export interface GanttScrollValue {
  taskListRef: React.RefObject<HTMLDivElement | null>;
  gridRef: React.RefObject<HTMLDivElement | null>;
  gridBodyRef: React.RefObject<HTMLDivElement | null>;
  onTaskListScroll: () => void;
  onGridScroll: () => void;
}

export const GanttScrollContext = createContext<GanttScrollValue | null>(null);

export function useGanttScroll(): GanttScrollValue {
  const ctx = useContext(GanttScrollContext);
  if (!ctx) {
    throw new Error("useGanttScroll must be used within a <GanttProvider>");
  }
  return ctx;
}

// --- Viewport -------------------------------------------------------------

/** Scroll offset + client size of the grid viewport, for virtualization. */
export const GanttViewportContext = createContext<ViewportMetrics | null>(null);

export function useGanttViewport(): ViewportMetrics {
  const ctx = useContext(GanttViewportContext);
  if (!ctx) {
    throw new Error("useGanttViewport must be used within a <GanttProvider>");
  }
  return ctx;
}

// --- Dependency -----------------------------------------------------------

export interface GanttDependencyValue {
  dependencies: TaskDependency[];
  onDependencyDelete?: (dep: TaskDependency) => void;
  startDrag: (state: DependencyDragState) => void;
  endDrag: (toTaskId: Id | null, toHandle?: ConnectorHandle) => void;
}

export const GanttDependencyContext = createContext<GanttDependencyValue | null>(null);

export function useGanttDependency(): GanttDependencyValue {
  const ctx = useContext(GanttDependencyContext);
  if (!ctx) {
    throw new Error("useGanttDependency must be used within a <GanttProvider>");
  }
  return ctx;
}

// --- Dependency drag ------------------------------------------------------

// Split in two: per-row ConnectorHandles only need "is a drag in progress"
// (changes at drag start/end), while DependencyPreview needs the coordinates
// (changes every drag-move frame). Primitive contexts, plain defaults.
export const GanttDragActiveContext = createContext<boolean>(false);

export function useGanttDragActive(): boolean {
  return useContext(GanttDragActiveContext);
}

export const GanttDragContext = createContext<DependencyDragState | null>(null);

export function useGanttDependencyDrag(): DependencyDragState | null {
  return useContext(GanttDragContext);
}

// --- Zoom -----------------------------------------------------------------

// Zoom controls exposed to the grid (for wheel/keyboard wiring). Identity-stable
// callbacks; the enabled flags are plain booleans.
export interface GanttZoomValue {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomAt: (focusPx: number, delta: number) => void;
  wheelEnabled: boolean;
  keyboardEnabled: boolean;
}

export const GanttZoomContext = createContext<GanttZoomValue | null>(null);

export function useGanttZoom(): GanttZoomValue {
  const ctx = useContext(GanttZoomContext);
  if (!ctx) {
    throw new Error("useGanttZoom must be used within a <GanttProvider>");
  }
  return ctx;
}
