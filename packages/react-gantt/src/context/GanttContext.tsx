import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { GanttTask, Id, Scale, TaskDependency } from "../types";
import { useTaskList } from "../hooks/useTaskList";
import { useExpand } from "../hooks/useExpand";
import { useScrollSync } from "../hooks/useScrollSync";
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

interface GanttContextValue {
  tasksList: GanttTask[];
  visibleTasks: GanttTask[];
  updateTask: (id: Id, patch: DatePatch) => void;
  expandedIds: Set<Id>;
  parentIds: Set<Id>;
  toggleExpand: (id: Id) => void;
  rowHeight: number;
  colWidth: number;
  scales?: Scale[];
  padDays: number;
  dependencies: TaskDependency[];
  onTaskClick?: (task: GanttTask) => void;
  onDependencyCreate?: (dep: TaskDependency) => void;
  onDependencyDelete?: (dep: TaskDependency) => void;
  taskListRef: React.RefObject<HTMLDivElement | null>;
  gridRef: React.RefObject<HTMLDivElement | null>;
  onTaskListScroll: () => void;
  onGridScroll: () => void;
  gridBodyRef: React.RefObject<HTMLDivElement | null>;
  drag: DependencyDragState | null;
  startDrag: (state: DependencyDragState) => void;
  updateDrag: (x: number, y: number) => void;
  endDrag: (toTaskId: Id | null, toHandle?: ConnectorHandle) => void;
}

const GanttContext = createContext<GanttContextValue | null>(null);

export interface GanttProviderProps {
  tasks: GanttTask[];
  rowHeight?: number;
  colWidth?: number;
  scales?: Scale[];
  padDays?: number;
  dependencies?: TaskDependency[];
  onTaskClick?: (task: GanttTask) => void;
  onDependencyCreate?: (dep: TaskDependency) => void;
  onDependencyDelete?: (dep: TaskDependency) => void;
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
  scales,
  padDays = DEFAULT_PAD_DAYS,
  dependencies = [],
  onTaskClick,
  onDependencyCreate,
  onDependencyDelete,
  children,
}: GanttProviderProps) {
  const { tasksList, updateTask } = useTaskList(tasks, dependencies);
  const { visibleTasks, expandedIds, parentIds, toggleExpand } = useExpand(tasksList);
  const { taskListRef, gridRef, onTaskListScroll, onGridScroll } = useScrollSync();
  const gridBodyRef = useRef<HTMLDivElement>(null);

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

  const updateDrag = useCallback((x: number, y: number) => {
    setDrag((prev) => (prev ? { ...prev, currentX: x, currentY: y } : null));
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

  return (
    <GanttContext.Provider
      value={{
        tasksList,
        visibleTasks,
        updateTask,
        expandedIds,
        parentIds,
        toggleExpand,
        rowHeight,
        colWidth,
        scales,
        padDays,
        dependencies,
        onTaskClick,
        onDependencyCreate,
        onDependencyDelete,
        taskListRef,
        gridRef,
        onTaskListScroll,
        onGridScroll,
        gridBodyRef,
        drag,
        startDrag,
        updateDrag,
        endDrag,
      }}
    >
      {children}
    </GanttContext.Provider>
  );
}

export function useGanttContext(): GanttContextValue {
  const ctx = useContext(GanttContext);
  if (!ctx) throw new Error("useGanttContext must be used within a <GanttProvider>");
  return ctx;
}
