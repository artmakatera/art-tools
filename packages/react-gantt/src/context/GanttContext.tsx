import {
  createContext,
  useCallback,
  useContext,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import type { ColumnApi, GanttHandle, GanttTask, Id, Scale, TaskDependency } from "../types";
import { useTaskList } from "../hooks/useTaskList";
import { useExpand } from "../hooks/useExpand";
import { useScrollSync, type ViewportMetrics } from "../hooks/useScrollSync";
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
  if (!ctx) throw new Error("useGanttConfig must be used within a <GanttProvider>");
  return ctx;
}

// --- Tasks ----------------------------------------------------------------

interface GanttTaskValue {
  tasksList: GanttTask[];
  visibleTasks: GanttTask[];
  updateTask: (id: Id, patch: DatePatch) => void;
  createTask: (task: GanttTask, afterId?: Id | null) => void;
  deleteTask: (id: Id) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** API handed to `ColumnDef.render` so columns can mutate/edit tasks. */
  columnApi: ColumnApi;
  selectedId: Id | null;
  setSelectedId: (id: Id | null) => void;
  expandedIds: Set<Id>;
  parentIds: Set<Id>;
  toggleExpand: (id: Id) => void;
  onTaskClick?: (task: GanttTask) => void;
}

const GanttTaskContext = createContext<GanttTaskValue | null>(null);

export function useGanttTask(): GanttTaskValue {
  const ctx = useContext(GanttTaskContext);
  if (!ctx) throw new Error("useGanttTask must be used within a <GanttProvider>");
  return ctx;
}

// --- Scroll ---------------------------------------------------------------

interface GanttScrollValue {
  taskListRef: React.RefObject<HTMLDivElement | null>;
  gridRef: React.RefObject<HTMLDivElement | null>;
  onTaskListScroll: () => void;
  onGridScroll: () => void;
  gridBodyRef: React.RefObject<HTMLDivElement | null>;
  /** Scroll offset + client size of the grid viewport, for virtualization. */
  viewport: ViewportMetrics;
  /** Scroll the task list vertically to reveal a task (auto-expanding ancestors). */
  scrollToTask: (id: Id) => void;
}

const GanttScrollContext = createContext<GanttScrollValue | null>(null);

export function useGanttScroll(): GanttScrollValue {
  const ctx = useContext(GanttScrollContext);
  if (!ctx) throw new Error("useGanttScroll must be used within a <GanttProvider>");
  return ctx;
}

// --- Dependency -----------------------------------------------------------

interface GanttDependencyValue {
  dependencies: TaskDependency[];
  onDependencyCreate?: (dep: TaskDependency) => void;
  onDependencyDelete?: (dep: TaskDependency) => void;
  drag: DependencyDragState | null;
  startDrag: (state: DependencyDragState) => void;
  endDrag: (toTaskId: Id | null, toHandle?: ConnectorHandle) => void;
}

const GanttDependencyContext = createContext<GanttDependencyValue | null>(null);

export function useGanttDependency(): GanttDependencyValue {
  const ctx = useContext(GanttDependencyContext);
  if (!ctx) throw new Error("useGanttDependency must be used within a <GanttProvider>");
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
  dependencies = [],
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

  // Vertical scroll-to-task. The row offset is a pure function of the target's
  // index in `visibleTasks`, so we scroll imperatively instead of round-tripping
  // through state + a layout effect. The real work lives in a ref assigned below
  // (once the scroll containers and visible list exist); this thin, stable
  // wrapper can be captured by `onTaskCreate` before those hooks run. Callers
  // that create a task must commit that state synchronously (see `createTask`'s
  // flushSync) so the new row is already in `visibleTasks` at call time.
  const scrollImplRef = useRef<(id: Id) => void>(() => {});
  const scrollToTask = useCallback((id: Id) => scrollImplRef.current(id), []);

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
      editTask: (task) => onTaskEdit?.(task),
    }),
    [createTask, updateTask, deleteTask, undo, redo, scrollToTask, onTaskEdit],
  );
  const [drag, setDrag] = useState<DependencyDragState | null>(null);
  const dragListenersRef = useRef<{ move: (e: MouseEvent) => void; up: (e: MouseEvent) => void } | null>(null);

  const startDrag = useCallback((state: DependencyDragState) => {
    setDrag(state);

    const onMouseMove = (e: MouseEvent) => {
      if (!gridBodyRef.current) return;
      const rect = gridBodyRef.current.getBoundingClientRect();
      setDrag((prev) =>
        prev ? { ...prev, currentX: e.clientX - rect.left, currentY: e.clientY - rect.top } : null,
      );
    };

    const onMouseUp = () => {
      setDrag(null);
      if (dragListenersRef.current) {
        window.removeEventListener("mousemove", dragListenersRef.current.move);
        window.removeEventListener("mouseup", dragListenersRef.current.up);
        dragListenersRef.current = null;
      }
    };

    dragListenersRef.current = { move: onMouseMove, up: onMouseUp };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  const endDrag = useCallback(
    (toTaskId: Id | null, toHandle?: ConnectorHandle) => {
      setDrag((prev) => {
        if (prev && toTaskId !== null && toHandle && toTaskId !== prev.fromTaskId) {
          const type = HANDLE_TO_TYPE[prev.handle][toHandle];
          onDependencyCreate?.({ from: prev.fromTaskId, to: toTaskId, type });
        }
        return null;
      });
      if (dragListenersRef.current) {
        window.removeEventListener("mousemove", dragListenersRef.current.move);
        window.removeEventListener("mouseup", dragListenersRef.current.up);
        dragListenersRef.current = null;
      }
    },
    [onDependencyCreate],
  );

  const configValue = useMemo<GanttConfigValue>(
    () => ({ rowHeight, colWidth, scales, padDays, height }),
    [rowHeight, colWidth, scales, padDays, height],
  );

  const taskValue = useMemo<GanttTaskValue>(
    () => ({
      tasksList,
      visibleTasks,
      updateTask,
      createTask,
      deleteTask,
      undo,
      redo,
      canUndo,
      canRedo,
      columnApi,
      selectedId,
      setSelectedId,
      expandedIds,
      parentIds,
      toggleExpand,
      onTaskClick,
    }),
    [
      tasksList,
      visibleTasks,
      updateTask,
      createTask,
      deleteTask,
      undo,
      redo,
      canUndo,
      canRedo,
      columnApi,
      selectedId,
      expandedIds,
      parentIds,
      toggleExpand,
      onTaskClick,
    ],
  );

  const scrollValue = useMemo<GanttScrollValue>(
    () => ({
      taskListRef,
      gridRef,
      onTaskListScroll,
      onGridScroll,
      gridBodyRef,
      viewport,
      scrollToTask,
    }),
    [taskListRef, gridRef, onTaskListScroll, onGridScroll, viewport, scrollToTask],
  );

  const dependencyValue = useMemo<GanttDependencyValue>(
    () => ({
      dependencies,
      onDependencyCreate,
      onDependencyDelete,
      drag,
      startDrag,
      endDrag,
    }),
    [dependencies, onDependencyCreate, onDependencyDelete, drag, startDrag, endDrag],
  );

  return (
    <GanttConfigContext.Provider value={configValue}>
      <GanttTaskContext.Provider value={taskValue}>
        <GanttScrollContext.Provider value={scrollValue}>
          <GanttDependencyContext.Provider value={dependencyValue}>
            {children}
          </GanttDependencyContext.Provider>
        </GanttScrollContext.Provider>
      </GanttTaskContext.Provider>
    </GanttConfigContext.Provider>
  );
}
