import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { ChangeLog, GanttTask, Id, TaskCommand, TaskDependency, TaskPatch } from "../types";
import {
  createResolveCache,
  getTaskList,
  resolveCommittedTasksCached,
  type ResolveCache,
} from "../core/prepareData";
import {
  buildDependencyGraph,
  overlayOf,
  resolveCommit,
  scheduleDependents,
} from "../core/scheduling";
import type { BarCommit } from "../core/barUtils";
import { LINEAR_CONTEXT, type SchedulingContext } from "../core/taskDates";

const EMPTY_LOG: ChangeLog = { transactions: [], cursor: 0 };

// Module-level so an omitted `dependencies` prop keeps a stable identity and
// the dependency graph isn't rebuilt on every render.
export const EMPTY_DEPENDENCIES: TaskDependency[] = [];

/**
 * Every log mutation except `createTask` is scheduled at transition priority.
 *
 * The state update itself is trivial; the render it schedules is the expensive
 * half of an edit — rebuilding the display list and re-deriving every link's
 * geometry, ~230ms at 100k tasks. At transition priority React keeps the current
 * UI on screen while it prepares the next one, and real user input outranks that
 * work: a burst of edits restarts the pending render instead of committing every
 * intermediate one.
 *
 * This does not make an edit cheaper — the recompute is the same length either
 * way. It only stops that recompute from being the highest-priority thing on the
 * main thread.
 *
 * `createTask` stays synchronous (`flushSync`): its contract is that the new
 * task is already resolved when `onTaskCreate` fires.
 *
 * IMPORTANT for callers that pair a mutation with clearing a drag preview: both
 * updates must be made inside ONE `startTransition` so they land in the same
 * commit. Clearing the preview urgently while the dates arrive later paints one
 * frame of the bar back at its old position — see `Bar`'s commit handlers.
 */
function scheduleLogUpdate(update: () => void): void {
  startTransition(update);
}

/** Drop any redo branch, append `commands` as one transaction, advance the cursor. */
function appendTransaction(log: ChangeLog, commands: TaskCommand[]): ChangeLog {
  const kept = log.transactions.slice(0, log.cursor);
  return { transactions: [...kept, commands], cursor: kept.length + 1 };
}

/** Field-agnostic value equality; `Date`s compare by instant, not reference. */
function valuesEqual(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  return Object.is(a, b);
}

/** True when two tasks are equal across every field (Date-aware). */
function sameTask(a: GanttTask, b: GanttTask): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (!valuesEqual(a[key as keyof GanttTask], b[key as keyof GanttTask])) {
      return false;
    }
  }
  return true;
}

export interface UseTaskListOptions {
  onTaskCreate?: (task: GanttTask, afterId?: Id | null) => void;
  onTaskDelete?: (id: Id) => void;
  onTasksChange?: (tasks: GanttTask[]) => void;
}

export const useTaskList = (
  tasks: GanttTask[],
  dependencies: TaskDependency[] = EMPTY_DEPENDENCIES,
  options: UseTaskListOptions = {},
  ctx: SchedulingContext = LINEAR_CONTEXT,
) => {
  // Latest-ref so the returned mutators stay identity-stable even when the
  // caller passes inline callbacks; handlers read the current options at call
  // time. Updated during render, same pattern as `resolvedRef` below.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Same treatment for the scheduling context: event handlers need it fresh, but
  // must not gain a new identity when it changes, because `columnApi` and the
  // task-actions context memo on them. Memos below take it as a real dependency
  // instead — they need invalidation, not freshness.
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const [log, setLog] = useState<ChangeLog>(EMPTY_LOG);

  // Built once per dependency list and reused across every commit.
  const dependencyGraph = useMemo(() => buildDependencyGraph(dependencies), [dependencies]);

  // Resolve the log incrementally: the cache reuses the snapshot at the
  // previous cursor, so an edit costs one map clone instead of replaying the
  // whole log, and undo/redo to a recent cursor reuses the cached map as-is.
  // Both the display list and the edit base derive from this single resolved
  // map — no second replay.
  const resolveCacheRef = useRef<ResolveCache | null>(null);
  const resolvedById = useMemo(() => {
    resolveCacheRef.current ??= createResolveCache();
    return resolveCommittedTasksCached(resolveCacheRef.current, tasks, log);
  }, [tasks, log]);

  // Mirror the latest resolved map so event handlers (updateTask) can read the
  // current effective state without replaying. Updated every render, so at the
  // time a handler fires it matches the committed `log` (= `prev`).
  const resolvedRef = useRef(resolvedById);
  resolvedRef.current = resolvedById;

  // Depends on the calendar: the roll-up resolves duration-only children through
  // it, so a calendar change must recompute or every summary bar goes stale.
  const tasksList = useMemo(() => getTaskList(resolvedById, ctx), [resolvedById, ctx]);

  /**
   * Commit a finished drag. Unlike `updateTask` — which writes consumer-supplied
   * dates verbatim — this is the library authoring dates, so it is the only path
   * that snaps onto working time (ADR-012).
   */
  const commitTask = useCallback(
    (id: Id, commit: BarCommit) => {
      const base = resolvedRef.current.get(id);
      if (!base) {
        return;
      }
      const { startDate, endDate } = resolveCommit(base, commit, ctxRef.current);
      const nextTask: GanttTask = { ...base, startDate, endDate };

      // A drag that resolves back to where it started records no undo step, which is
      // also what makes a bar dropped in non-working time visibly settle back: the
      // transient override is cleared unconditionally and nothing replaces it.
      if (sameTask(nextTask, base)) {
        return;
      }

      const commands: TaskCommand[] = [{ type: "update", task: nextTask }];
      if (dependencyGraph.size > 0) {
        // Copy-on-write view, not a clone: the cascade touches a handful of tasks,
        // so cloning the whole resolved map would dominate the edit at scale.
        const current = overlayOf(resolvedRef.current);
        current.set(id, nextTask);
        const rescheduled = scheduleDependents(current, dependencyGraph, id, ctxRef.current);
        for (const task of rescheduled.values()) {
          commands.push({ type: "update", task });
        }
      }
      scheduleLogUpdate(() => setLog((prev) => appendTransaction(prev, commands)));
    },
    [dependencyGraph],
  );

  const updateTask = useCallback(
    (id: Id, patch: TaskPatch) => {
      // Build on the latest committed task (pre-roll-up) from the resolved map.
      const base = resolvedRef.current.get(id);
      if (!base) {
        return;
      }

      const nextTask: GanttTask = { ...base };
      if (patch.name !== undefined) {
        nextTask.name = patch.name;
      }
      if (patch.startDate) {
        nextTask.startDate = patch.startDate;
      }
      if (patch.endDate) {
        nextTask.endDate = patch.endDate;
      }
      if (patch.progress !== undefined) {
        nextTask.progress = patch.progress;
      }

      // Nothing actually changed → skip the empty undo step (and any reschedule).
      if (sameTask(nextTask, base)) {
        return;
      }

      const commands: TaskCommand[] = [{ type: "update", task: nextTask }];

      // Automatic forward scheduling: when a task moves, realign its dependents
      // so each dependency relationship stays satisfied, then cascade onward.
      // All reschedules join the same transaction → one undo step.
      const moved = patch.startDate !== undefined || patch.endDate !== undefined;
      if (moved && dependencyGraph.size > 0) {
        // Copy-on-write view so scheduling never touches the shared resolved map,
        // without paying an O(n) clone for a cascade that moves a handful of tasks.
        const current = overlayOf(resolvedRef.current);
        current.set(id, nextTask);
        const rescheduled = scheduleDependents(current, dependencyGraph, id, ctxRef.current);
        for (const task of rescheduled.values()) {
          commands.push({ type: "update", task });
        }
      }

      scheduleLogUpdate(() => setLog((prev) => appendTransaction(prev, commands)));
    },
    [dependencyGraph],
  );

  const createTask = useCallback((task: GanttTask, afterId?: Id | null) => {
    // Commit synchronously so the new task is present in the resolved list (and
    // thus in the consumer's `visibleTasks`) before `onTaskCreate` fires. This
    // lets handlers like scroll-to-new-task read post-create state imperatively
    // without waiting for an effect.
    flushSync(() => {
      setLog((prev) => appendTransaction(prev, [{ type: "create", task, afterId }]));
    });
    optionsRef.current.onTaskCreate?.(task, afterId);
  }, []);

  const deleteTask = useCallback((id: Id) => {
    scheduleLogUpdate(() => setLog((prev) => appendTransaction(prev, [{ type: "delete", id }])));
    optionsRef.current.onTaskDelete?.(id);
  }, []);

  const undo = useCallback(() => {
    scheduleLogUpdate(() =>
      setLog((prev) => (prev.cursor > 0 ? { ...prev, cursor: prev.cursor - 1 } : prev)),
    );
  }, []);

  const redo = useCallback(() => {
    scheduleLogUpdate(() =>
      setLog((prev) =>
        prev.cursor < prev.transactions.length ? { ...prev, cursor: prev.cursor + 1 } : prev,
      ),
    );
  }, []);

  const canUndo = log.cursor > 0;
  const canRedo = log.cursor < log.transactions.length;

  const tasksListRef = useRef(tasksList);
  tasksListRef.current = tasksList;

  const notifiedLog = useRef(log);
  useEffect(() => {
    if (notifiedLog.current === log) {
      return;
    }
    notifiedLog.current = log;
    optionsRef.current.onTasksChange?.(tasksListRef.current);
  }, [log]);

  return {
    tasksList,
    updateTask,
    commitTask,
    createTask,
    deleteTask,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};
