import { useCallback, useEffect, useRef } from "react";
import type { GanttTask, Id } from "../types";
import { scrollOffsetToReveal } from "../core/scroll";
import { useLatestRef } from "./useLatestRef";

interface UseScrollToTaskOptions {
  taskListRef: React.RefObject<HTMLDivElement | null>;
  gridRef: React.RefObject<HTMLDivElement | null>;
  visibleTasks: GanttTask[];
  rowHeight: number;
  /** Expands every collapsed ancestor of a task (from `useExpand`). */
  revealAncestors: (id: Id) => void;
}

/**
 * Returns a `scrollToTask(id)` that vertically reveals a task's row in
 * whichever pane is mounted. Writing scrollTop fires that pane's onScroll,
 * which syncs the other pane and re-windows both.
 *
 * A task inside a collapsed branch is not in `visibleTasks` and therefore has
 * no row to scroll to. Rather than bailing (which silently broke the documented
 * "auto-expands collapsed ancestors" contract on `GanttHandle.scrollToTask`),
 * we expand the ancestors and retry once the expanded list arrives.
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
  revealAncestors,
}: UseScrollToTaskOptions): (id: Id) => void {
  const visibleTasksRef = useLatestRef(visibleTasks);
  const implRef = useRef<(id: Id) => void>(() => {});
  // Set when a scroll target was hidden behind a collapsed ancestor; consumed by
  // the effect below on the render where the task finally becomes visible.
  const pendingIdRef = useRef<Id | null>(null);

  implRef.current = (id: Id) => {
    const el = taskListRef.current ?? gridRef.current;
    if (!el) {
      return;
    }
    const index = visibleTasksRef.current.findIndex((t) => t.id === id);
    if (index < 0) {
      pendingIdRef.current = id;
      revealAncestors(id);
      return;
    }
    pendingIdRef.current = null;
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

  // Retry after an expand. If the id still isn't there (it was deleted, or it
  // was never in the list at all), the retry is another no-op that clears the
  // pending slot, so this can't loop.
  useEffect(() => {
    const pending = pendingIdRef.current;
    if (pending === null) {
      return;
    }
    if (visibleTasks.some((t) => t.id === pending)) {
      implRef.current(pending);
    } else {
      pendingIdRef.current = null;
    }
  }, [visibleTasks]);

  return useCallback((id: Id) => implRef.current(id), []);
}
