import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import type { ColumnApi, GanttHandle, GanttTask, Id, Scale, TaskDependency } from "../types";
import { useTaskList, EMPTY_DEPENDENCIES } from "../hooks/useTaskList";
import { useExpand } from "../hooks/useExpand";
import { useScrollSync, type ViewportMetrics } from "../hooks/useScrollSync";
import { useEventCallback } from "../hooks/useEventCallback";
import { useLatestRef } from "../hooks/useLatestRef";
import { useScrollToTask } from "../hooks/useScrollToTask";
import { useZoom } from "../hooks/useZoom";
import { DEFAULT_ZOOM_INDEX, resolveZoomLevels, type ZoomLevel } from "../core/zoom";
import {
  useDependencyDrag,
  type ConnectorHandle,
  type DependencyDragState,
} from "../hooks/useDependencyDrag";
import type { DatePatch } from "../core/barUtils";
import { DEFAULT_PAD_DAYS, DEFAULT_ROW_HEIGHT } from "../core/constants";

export type { ConnectorHandle, DependencyDragState } from "../hooks/useDependencyDrag";

// Contexts are split by update frequency so high-frequency state (drag
// position, viewport, selection) never invalidates consumers that only need
// stable references. Rough cadence, hottest first:
//   drag position  → every drag-move frame   (DependencyPreview only)
//   viewport       → every scroll frame      (Grid only)
//   selection      → per click               (TaskList only)
//   task state     → per edit/expand         (Grid, TaskList)
//   everything else is identity-stable across those updates.

// --- Config ---------------------------------------------------------------

interface GanttConfigValue {
  rowHeight: number;
  colWidth: number;
  scales?: Scale[];
  padDays: number;
  /** Total component height in px; undefined = grow with content. */
  height?: number;
}

const GanttConfigContext = createContext<GanttConfigValue | null>(null);

export function useGanttConfig(): GanttConfigValue {
  const ctx = useContext(GanttConfigContext);
  if (!ctx) {
    throw new Error("useGanttConfig must be used within a <GanttProvider>");
  }
  return ctx;
}

// --- Task state -----------------------------------------------------------

interface GanttTaskStateValue {
  tasksList: GanttTask[];
  visibleTasks: GanttTask[];
  expandedIds: Set<Id>;
  parentIds: Set<Id>;
  canUndo: boolean;
  canRedo: boolean;
}

const GanttTaskStateContext = createContext<GanttTaskStateValue | null>(null);

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
interface GanttTaskActionsValue {
  updateTask: (id: Id, patch: DatePatch) => void;
  createTask: (task: GanttTask, afterId?: Id | null) => void;
  deleteTask: (id: Id) => void;
  undo: () => void;
  redo: () => void;
  /** API handed to `ColumnDef.render` so columns can mutate/edit tasks. */
  columnApi: ColumnApi;
  setSelectedId: (id: Id | null) => void;
  toggleExpand: (id: Id) => void;
  onTaskClick?: (task: GanttTask) => void;
  scrollToTask: (id: Id) => void;
}

const GanttTaskActionsContext = createContext<GanttTaskActionsValue | null>(null);

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
const GanttSelectionContext = createContext<Id | null>(null);

export function useGanttSelectedId(): Id | null {
  return useContext(GanttSelectionContext);
}

// --- Scroll ---------------------------------------------------------------

// Refs and handlers only — all identity-stable, so this context never
// re-renders its consumers. Viewport metrics live in their own context below.
interface GanttScrollValue {
  taskListRef: React.RefObject<HTMLDivElement | null>;
  gridRef: React.RefObject<HTMLDivElement | null>;
  gridBodyRef: React.RefObject<HTMLDivElement | null>;
  onTaskListScroll: () => void;
  onGridScroll: () => void;
  /** Scroll the task list vertically to reveal a task. */
  scrollToTask: (id: Id) => void;
}

const GanttScrollContext = createContext<GanttScrollValue | null>(null);

export function useGanttScroll(): GanttScrollValue {
  const ctx = useContext(GanttScrollContext);
  if (!ctx) {
    throw new Error("useGanttScroll must be used within a <GanttProvider>");
  }
  return ctx;
}

// --- Viewport -------------------------------------------------------------

/** Scroll offset + client size of the grid viewport, for virtualization. */
const GanttViewportContext = createContext<ViewportMetrics | null>(null);

export function useGanttViewport(): ViewportMetrics {
  const ctx = useContext(GanttViewportContext);
  if (!ctx) {
    throw new Error("useGanttViewport must be used within a <GanttProvider>");
  }
  return ctx;
}

// --- Dependency -----------------------------------------------------------

interface GanttDependencyValue {
  dependencies: TaskDependency[];
  onDependencyDelete?: (dep: TaskDependency) => void;
  startDrag: (state: DependencyDragState) => void;
  endDrag: (toTaskId: Id | null, toHandle?: ConnectorHandle) => void;
}

const GanttDependencyContext = createContext<GanttDependencyValue | null>(null);

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
const GanttDragActiveContext = createContext<boolean>(false);

export function useGanttDragActive(): boolean {
  return useContext(GanttDragActiveContext);
}

const GanttDragContext = createContext<DependencyDragState | null>(null);

export function useGanttDependencyDrag(): DependencyDragState | null {
  return useContext(GanttDragContext);
}

// --- Zoom -----------------------------------------------------------------

// Zoom controls exposed to the grid (for wheel/keyboard wiring). Identity-stable
// callbacks; the enabled flags are plain booleans.
interface GanttZoomValue {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomAt: (focusPx: number, delta: number) => void;
  wheelEnabled: boolean;
  keyboardEnabled: boolean;
}

const GanttZoomContext = createContext<GanttZoomValue | null>(null);

export function useGanttZoom(): GanttZoomValue {
  const ctx = useContext(GanttZoomContext);
  if (!ctx) {
    throw new Error("useGanttZoom must be used within a <GanttProvider>");
  }
  return ctx;
}

// --- Provider -------------------------------------------------------------

export interface GanttProviderProps {
  tasks: GanttTask[];
  rowHeight?: number;
  colWidth?: number;
  height?: number;
  scales?: Scale[];
  padDays?: number;
  /** Zoom ladder (coarse → fine). Defaults to the built-in ladder. */
  zoomLevels?: ZoomLevel[];
  /** Starting rung of the zoom ladder. */
  defaultZoomIndex?: number;
  /** Fired when the zoom level changes (and once on mount). */
  onZoomChange?: (state: { index: number; count: number }) => void;
  /** Enable Ctrl/Cmd + mouse-wheel zoom over the grid (anchors on the cursor). */
  zoomWheel?: boolean;
  /** Enable +/- keyboard zoom when the grid is focused. */
  zoomKeyboard?: boolean;
  dependencies?: TaskDependency[];
  onTaskClick?: (task: GanttTask) => void;
  onDependencyCreate?: (dep: TaskDependency) => void;
  onDependencyDelete?: (dep: TaskDependency) => void;
  onTaskCreate?: (task: GanttTask, afterId?: Id | null) => void;
  onTaskDelete?: (id: Id) => void;
  onTaskEdit?: (task: GanttTask) => void;
  onTasksChange?: (tasks: GanttTask[]) => void;
  apiRef?: Ref<GanttHandle>;
  children: ReactNode;
}

export function GanttProvider({
  tasks,
  rowHeight = DEFAULT_ROW_HEIGHT,
  colWidth,
  height,
  scales,
  padDays = DEFAULT_PAD_DAYS,
  zoomLevels,
  defaultZoomIndex,
  onZoomChange,
  zoomWheel = false,
  zoomKeyboard = false,
  dependencies = EMPTY_DEPENDENCIES,
  onTaskClick,
  onDependencyCreate,
  onDependencyDelete,
  onTaskCreate: onTaskCreateProp,
  onTaskDelete,
  onTaskEdit,
  onTasksChange,
  apiRef,
  children,
}: GanttProviderProps) {
  const [selectedId, setSelectedId] = useState<Id | null>(null);

  // Latest-refs for consumer callbacks used internally at a single call site,
  // so the handlers that wrap them keep a stable identity even when the
  // consumer passes inline functions.
  const onTaskEditRef = useLatestRef(onTaskEdit);

  // Callbacks handed to consumers through context: presence-preserving stable
  // wrappers, so context values only churn when the callback's presence flips.
  const onTaskClickStable = useEventCallback(onTaskClick);
  const onDependencyDeleteStable = useEventCallback(onDependencyDelete);

  const {
    tasksList,
    updateTask,
    createTask: commitCreateTask,
    deleteTask,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useTaskList(tasks, dependencies, {
    onTaskCreate: onTaskCreateProp,
    onTaskDelete,
    onTasksChange,
  });

  const { visibleTasks, expandedIds, parentIds, toggleExpand } =
    useExpand(tasksList);
  const { taskListRef, gridRef, onTaskListScroll, onGridScroll, viewport } = useScrollSync();
  const gridBodyRef = useRef<HTMLDivElement>(null);

  const scrollToTask = useScrollToTask({ taskListRef, gridRef, visibleTasks, rowHeight });

  // Zoom owns the effective `scales`/`colWidth`: each ladder rung defines the
  // calendar rows and the column width. Standalone `scales`/`colWidth` props
  // seed the default rung (see resolveZoomLevels).
  const zoomLevelsResolved = useMemo(
    () => resolveZoomLevels(zoomLevels, scales, colWidth),
    [zoomLevels, scales, colWidth],
  );
  const zoom = useZoom({
    gridRef,
    visibleTasks,
    padDays,
    levels: zoomLevelsResolved,
    initialIndex: defaultZoomIndex ?? DEFAULT_ZOOM_INDEX,
  });

  // Notify the consumer of the zoom level (on mount and each change).
  const onZoomChangeRef = useLatestRef(onZoomChange);
  useEffect(() => {
    onZoomChangeRef.current?.({ index: zoom.index, count: zoom.count });
  }, [zoom.index, zoom.count, onZoomChangeRef]);

  // Commit (flushSync inside, so the consumer's onTaskCreate fires first),
  // then select and reveal the new task. `scrollToTask` sees the fresh list:
  // flushSync re-rendered this provider before returning.
  const createTask = useCallback(
    (task: GanttTask, afterId?: Id | null) => {
      commitCreateTask(task, afterId);
      setSelectedId(task.id);
      scrollToTask(task.id);
    },
    [commitCreateTask, scrollToTask],
  );

  const { zoomIn, zoomOut, setZoom, zoomAt } = zoom;
  useImperativeHandle(
    apiRef,
    () => ({
      createTask,
      updateTask,
      deleteTask,
      undo,
      redo,
      scrollToTask,
      zoomIn,
      zoomOut,
      setZoom,
    }),
    [createTask, updateTask, deleteTask, undo, redo, scrollToTask, zoomIn, zoomOut, setZoom],
  );

  const columnApi = useMemo<ColumnApi>(
    () => ({
      createTask,
      updateTask,
      deleteTask,
      undo,
      redo,
      scrollToTask,
      zoomIn,
      zoomOut,
      setZoom,
      editTask: (task) => onTaskEditRef.current?.(task),
    }),
    // onTaskEditRef is identity-stable (useLatestRef); listed only to satisfy
    // exhaustive-deps.
    [createTask, updateTask, deleteTask, undo, redo, scrollToTask, zoomIn, zoomOut, setZoom, onTaskEditRef],
  );

  const { drag, startDrag, endDrag } = useDependencyDrag({ gridBodyRef, onDependencyCreate });

  // --- Context values ---
  const configValue = useMemo<GanttConfigValue>(
    () => ({
      rowHeight,
      colWidth: zoom.level.colWidth,
      scales: zoom.level.scales,
      padDays,
      height,
    }),
    [rowHeight, zoom.level, padDays, height],
  );

  const zoomValue = useMemo<GanttZoomValue>(
    () => ({
      zoomIn,
      zoomOut,
      zoomAt,
      wheelEnabled: zoomWheel,
      keyboardEnabled: zoomKeyboard,
    }),
    [zoomIn, zoomOut, zoomAt, zoomWheel, zoomKeyboard],
  );

  const taskStateValue = useMemo<GanttTaskStateValue>(
    () => ({ tasksList, visibleTasks, expandedIds, parentIds, canUndo, canRedo }),
    [tasksList, visibleTasks, expandedIds, parentIds, canUndo, canRedo],
  );

  // `setSelectedId` is a useState setter — stable, safe to omit from deps.
  const taskActionsValue = useMemo<GanttTaskActionsValue>(
    () => ({
      updateTask,
      createTask,
      deleteTask,
      undo,
      redo,
      columnApi,
      setSelectedId,
      toggleExpand,
      onTaskClick: onTaskClickStable,
      scrollToTask,
    }),
    [updateTask, createTask, deleteTask, undo, redo, columnApi, toggleExpand, onTaskClickStable, scrollToTask],
  );

  // All members are stable refs/callbacks → created exactly once.
  const scrollValue = useMemo<GanttScrollValue>(
    () => ({ taskListRef, gridRef, gridBodyRef, onTaskListScroll, onGridScroll, scrollToTask }),
    [taskListRef, gridRef, onTaskListScroll, onGridScroll, scrollToTask],
  );

  const dependencyValue = useMemo<GanttDependencyValue>(
    () => ({
      dependencies,
      onDependencyDelete: onDependencyDeleteStable,
      startDrag,
      endDrag,
    }),
    [dependencies, onDependencyDeleteStable, startDrag, endDrag],
  );

  // `viewport`, `selectedId`, `drag`, and `drag !== null` are passed directly:
  // primitives or already identity-stable when unchanged.
  return (
    <GanttConfigContext.Provider value={configValue}>
      <GanttZoomContext.Provider value={zoomValue}>
        <GanttScrollContext.Provider value={scrollValue}>
          <GanttTaskActionsContext.Provider value={taskActionsValue}>
            <GanttDependencyContext.Provider value={dependencyValue}>
              <GanttTaskStateContext.Provider value={taskStateValue}>
                <GanttSelectionContext.Provider value={selectedId}>
                  <GanttDragActiveContext.Provider value={drag !== null}>
                    <GanttViewportContext.Provider value={viewport}>
                      <GanttDragContext.Provider value={drag}>
                        {children}
                      </GanttDragContext.Provider>
                    </GanttViewportContext.Provider>
                  </GanttDragActiveContext.Provider>
                </GanttSelectionContext.Provider>
              </GanttTaskStateContext.Provider>
            </GanttDependencyContext.Provider>
          </GanttTaskActionsContext.Provider>
        </GanttScrollContext.Provider>
      </GanttZoomContext.Provider>
    </GanttConfigContext.Provider>
  );
}
