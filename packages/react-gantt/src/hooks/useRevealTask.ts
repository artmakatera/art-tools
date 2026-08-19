import { useCallback, useLayoutEffect, useRef } from "react";
import type { GanttTask, Id, Scale } from "../types";
import { scrollOffsetToReveal } from "../core/scroll";
import { computeTaskPixels } from "../core/barUtils";
import { timelineOrigin } from "../core/timeline";
import { resolveColumnUnit } from "../core/scales";
import { useLatestRef } from "./useLatestRef";

/** Which axes to reveal on. Defaults match the historical `scrollToTask(id)`. */
export interface RevealOptions {
  /** Reveal the task's row vertically, in whichever pane is mounted. Default `true`. */
  vertical?: boolean;
  /** Reveal the task's bar horizontally in the grid. Default `false`. */
  horizontal?: boolean;
}

interface UseRevealTaskOptions {
  taskListRef: React.RefObject<HTMLDivElement | null>;
  gridRef: React.RefObject<HTMLDivElement | null>;
  /** The whole list, so an id hidden under a collapsed parent is still known. */
  tasksList: GanttTask[];
  visibleTasks: GanttTask[];
  rowHeight: number;
  colWidth: number;
  scales?: Scale[];
  padDays: number;
  /** Expands every collapsed ancestor of an id; from `useExpand`. */
  revealAncestors: (id: Id) => void;
}

/**
 * The single way to bring a task into view.
 *
 * Replaces two same-named functions pulling in opposite directions: a
 * `scrollToTask(id)` on the context that revealed *vertically*, and a
 * component-local `scrollToTask(task)` inside `TaskList` that revealed
 * *horizontally* — which shadowed the importable one and duplicated the origin
 * derivation to do it.
 *
 * A bare `revealTask(id)` is byte-for-byte the old vertical behaviour, so the
 * defaults keep every existing caller intact.
 *
 * Identity-stable forever: it dispatches through a ref whose implementation is
 * reassigned each render, so it closes over current geometry without ever
 * changing identity — which matters because it is a dependency of `columnApi` and
 * the task-actions context, which every memoized row consumes.
 */
export function useRevealTask({
  taskListRef,
  gridRef,
  tasksList,
  visibleTasks,
  rowHeight,
  colWidth,
  scales,
  padDays,
  revealAncestors,
}: UseRevealTaskOptions): (id: Id, options?: RevealOptions) => void {
  const tasksListRef = useLatestRef(tasksList);
  const visibleTasksRef = useLatestRef(visibleTasks);
  const implRef = useRef<(id: Id, options?: RevealOptions) => void>(() => {});
  /** A reveal waiting for an expansion to commit before it can find its row. */
  const pending = useRef<{ id: Id; options?: RevealOptions } | null>(null);

  const revealVertically = (index: number): void => {
    const el = taskListRef.current ?? gridRef.current;
    if (!el) {
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

  const revealHorizontally = (task: GanttTask): void => {
    const grid = gridRef.current;
    const origin = timelineOrigin(visibleTasksRef.current, scales, padDays);
    if (!grid || !origin) {
      return;
    }
    const { left, width } = computeTaskPixels(
      task,
      {},
      origin,
      colWidth,
      resolveColumnUnit(scales),
    );
    const nextLeft = scrollOffsetToReveal(
      left,
      width,
      grid.scrollLeft,
      grid.clientWidth,
      colWidth, // keep one column of padding
    );
    if (nextLeft !== grid.scrollLeft) {
      grid.scrollLeft = nextLeft;
    }
  };

  implRef.current = (id, options) => {
    const { vertical = true, horizontal = false } = options ?? {};
    const index = visibleTasksRef.current.findIndex((t) => t.id === id);

    if (index < 0) {
      // Not in the window. Either the id is unknown — a documented no-op — or it
      // is hidden under a collapsed ancestor, which is what `revealAncestors`
      // exists for. Expansion is a state update, so the row cannot be measured
      // until it commits: park the request and finish in the layout effect below.
      // (Not `flushSync`: this is public via `apiRef` and a consumer may call it
      // from inside an effect, where flushing synchronously is a warning.)
      if (!tasksListRef.current.some((t) => t.id === id)) {
        return;
      }
      pending.current = { id, options };
      revealAncestors(id);
      return;
    }

    if (vertical) {
      revealVertically(index);
    }
    if (horizontal) {
      revealHorizontally(visibleTasksRef.current[index]!);
    }
  };

  useLayoutEffect(() => {
    const anchor = pending.current;
    if (!anchor) {
      return;
    }
    // Cleared unconditionally: a request left parked would fire a surprise scroll
    // on the next unrelated expand.
    pending.current = null;
    implRef.current(anchor.id, anchor.options);
  }, [visibleTasks]);

  return useCallback((id: Id, options?: RevealOptions) => implRef.current(id, options), []);
}
