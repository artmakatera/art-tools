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
import { scrollOffsetToReveal } from "../core/scroll";
import type { DatePatch } from "../core/barUtils";
import {
  DEFAULT_COL_WIDTH,
  DEFAULT_PAD_DAYS,
  DEFAULT_ROW_HEIGHT,
} from "../core/constants";

export type ConnectorHandle = "start" | "end";

export interface DependencyDragState {
  fromTaskId: Id;
  handle: ConnectorHandle;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

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

// --- Provider -------------------------------------------------------------

export interface GanttProviderProps {
  tasks: GanttTask[];
  rowHeight?: number;
  colWidth?: number;
  height?: number;
  scales?: Scale[];
  padDays?: number;
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

const HANDLE_TO_TYPE: Record<ConnectorHandle, Record<ConnectorHandle, TaskDependency["type"]>> = {
  end: { start: "FS", end: "FF" },
  start: { start: "SS", end: "SF" },
};

export function GanttProvider({
  tasks,
  rowHeight = DEFAULT_ROW_HEIGHT,
  colWidth = DEFAULT_COL_WIDTH,
  height,
  scales,
  padDays = DEFAULT_PAD_DAYS,
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
  const scrollImplRef = useRef<(id: Id) => void>(() => {});
  const scrollToTask = useCallback((id: Id) => scrollImplRef.current(id), []);

  // Latest-refs for consumer callbacks used internally at a single call site,
  // so the handlers that wrap them keep a stable identity even when the
  // consumer passes inline functions.
  const onTaskEditRef = useRef(onTaskEdit);
  onTaskEditRef.current = onTaskEdit;
  const onDependencyCreateRef = useRef(onDependencyCreate);
  onDependencyCreateRef.current = onDependencyCreate;

  // Callbacks handed to consumers through context: presence-preserving stable
  // wrappers, so context values only churn when the callback's presence flips.
  const onTaskClickStable = useEventCallback(onTaskClick);
  const onDependencyDeleteStable = useEventCallback(onDependencyDelete);

  const onTaskCreate = useCallback(
    (task: GanttTask, afterId?: Id | null) => {
      onTaskCreateProp?.(task, afterId);
      setSelectedId(task.id);
      scrollToTask(task.id);
    },
    [onTaskCreateProp, scrollToTask],
  );

  const { tasksList, updateTask, createTask, deleteTask, undo, redo, canUndo, canRedo } =
    useTaskList(tasks, dependencies, { onTaskCreate, onTaskDelete, onTasksChange });

  const { visibleTasks, expandedIds, parentIds, toggleExpand } =
    useExpand(tasksList);
  const { taskListRef, gridRef, onTaskListScroll, onGridScroll, viewport } = useScrollSync();
  const gridBodyRef = useRef<HTMLDivElement>(null);

  // Latest visible list, read at scroll time so the stable `scrollToTask` never
  // captures a stale snapshot.
  const visibleTasksRef = useRef(visibleTasks);
  visibleTasksRef.current = visibleTasks;

  // Reveal the target row by writing scrollTop on whichever pane is mounted;
  // that fires the pane's onScroll, which syncs the other pane and re-windows
  // both. Reassigned every render so it closes over the current rowHeight/refs.
  scrollImplRef.current = (id: Id) => {
    const el = taskListRef.current ?? gridRef.current;
    if (!el) {
      return;
    }
    const index = visibleTasksRef.current.findIndex((t) => t.id === id);
    if (index < 0) {
      return;
    }
    const next = scrollOffsetToReveal(
      index * rowHeight,
      rowHeight,
      el.scrollTop,
      el.clientHeight,
      rowHeight,
    );
    if (next !== el.scrollTop) {
      el.scrollTop = next;
    }
  };

  useImperativeHandle(
    apiRef,
    () => ({ createTask, updateTask, deleteTask, undo, redo, scrollToTask }),
    [createTask, updateTask, deleteTask, undo, redo, scrollToTask],
  );

  const columnApi = useMemo<ColumnApi>(
    () => ({
      createTask,
      updateTask,
      deleteTask,
      undo,
      redo,
      scrollToTask,
      editTask: (task) => onTaskEditRef.current?.(task),
    }),
    [createTask, updateTask, deleteTask, undo, redo, scrollToTask],
  );

  // --- Dependency drag state ---
  const [drag, setDrag] = useState<DependencyDragState | null>(null);
  // Mirror for handlers (endDrag) so they can read the current drag without
  // subscribing to it; drag is committed at mousedown, well before any mouseup.
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const dragListenersRef = useRef<{ move: (e: MouseEvent) => void; up: (e: MouseEvent) => void } | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);

  // Idempotent: safe to call from mouseup, endDrag, and unmount in any order.
  const clearDragListeners = useCallback(() => {
    if (dragListenersRef.current) {
      window.removeEventListener("mousemove", dragListenersRef.current.move);
      window.removeEventListener("mouseup", dragListenersRef.current.up);
      dragListenersRef.current = null;
    }
    if (dragFrameRef.current !== null) {
      cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
  }, []);

  // The window listeners would leak if the provider unmounted mid-drag.
  useEffect(() => clearDragListeners, [clearDragListeners]);

  const startDrag = useCallback((state: DependencyDragState) => {
    setDrag(state);

    // Coalesce mousemove bursts into one state update per frame. The rect is
    // re-read inside the frame: the body's viewport-relative position shifts
    // while the grid scrolls under the cursor.
    const onMouseMove = (e: MouseEvent) => {
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      if (dragFrameRef.current !== null) {
        return;
      }
      dragFrameRef.current = requestAnimationFrame(() => {
        dragFrameRef.current = null;
        const body = gridBodyRef.current;
        const last = lastMouseRef.current;
        if (!body || !last) {
          return;
        }
        const rect = body.getBoundingClientRect();
        setDrag((prev) =>
          prev
            ? { ...prev, currentX: last.x - rect.left, currentY: last.y - rect.top }
            : null,
        );
      });
    };

    const onMouseUp = () => {
      setDrag(null);
      clearDragListeners();
    };

    dragListenersRef.current = { move: onMouseMove, up: onMouseUp };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [clearDragListeners]);

  const endDrag = useCallback(
    (toTaskId: Id | null, toHandle?: ConnectorHandle) => {
      const current = dragRef.current;
      if (current && toTaskId !== null && toHandle && toTaskId !== current.fromTaskId) {
        const type = HANDLE_TO_TYPE[current.handle][toHandle];
        onDependencyCreateRef.current?.({ from: current.fromTaskId, to: toTaskId, type });
      }
      setDrag(null);
      clearDragListeners();
    },
    [clearDragListeners],
  );

  // --- Context values ---
  const configValue = useMemo<GanttConfigValue>(
    () => ({ rowHeight, colWidth, scales, padDays, height }),
    [rowHeight, colWidth, scales, padDays, height],
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
    </GanttConfigContext.Provider>
  );
}
