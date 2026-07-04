import { useCallback, useRef } from "react";
import type { GanttTask, Id } from "../types";
import { scrollOffsetToReveal } from "../core/scroll";
import { useLatestRef } from "./useLatestRef";

interface UseScrollToTaskOptions {
  taskListRef: React.RefObject<HTMLDivElement | null>;
  gridRef: React.RefObject<HTMLDivElement | null>;
  visibleTasks: GanttTask[];
  rowHeight: number;
}

/**
 * Returns a `scrollToTask(id)` that vertically reveals a task's row in
 * whichever pane is mounted. Writing scrollTop fires that pane's onScroll,
 * which syncs the other pane and re-windows both.
 *
 * The returned callback is identity-stable forever: it dispatches through a
 * ref whose implementation is reassigned every render so it closes over the
 * current rowHeight, and reads `visibleTasks` through a latest-ref at call
 * time — so it never captures a stale snapshot, even when called in the same
 * tick as a flushSync commit (see `createTask` in GanttProvider).
 */
export function useScrollToTask({
  taskListRef,
  gridRef,
  visibleTasks,
  rowHeight,
}: UseScrollToTaskOptions): (id: Id) => void {
  const visibleTasksRef = useLatestRef(visibleTasks);
  const implRef = useRef<(id: Id) => void>(() => {});

  implRef.current = (id: Id) => {
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

  return useCallback((id: Id) => implRef.current(id), []);
}
