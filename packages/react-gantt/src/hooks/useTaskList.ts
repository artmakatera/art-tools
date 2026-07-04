import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { ChangeLog, GanttTask, Id, TaskCommand, TaskDependency, TaskPatch } from "../types";
import { getTaskList, resolveCommittedTasks } from "../core/prepareData";
import { buildDependencyGraph, scheduleDependents } from "../core/scheduling";

const EMPTY_LOG: ChangeLog = { transactions: [], cursor: 0 };

// Module-level so an omitted `dependencies` prop keeps a stable identity and
// the dependency graph isn't rebuilt on every render.
export const EMPTY_DEPENDENCIES: TaskDependency[] = [];

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

    if (!valuesEqual(a[key as keyof GanttTask], b[key as keyof GanttTask])) return false;
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
) => {
  // Latest-ref so the returned mutators stay identity-stable even when the
  // caller passes inline callbacks; handlers read the current options at call
  // time. Updated during render, same pattern as `resolvedRef` below.
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [log, setLog] = useState<ChangeLog>(EMPTY_LOG);

  // Built once per dependency list and reused across every commit.
  const dependencyGraph = useMemo(
    () => buildDependencyGraph(dependencies),
    [dependencies],
  );

  // Replay the log exactly once per change. Both the display list and the
  // edit base derive from this single resolved map — no second replay.
  const resolvedById = useMemo(
    () => resolveCommittedTasks(tasks, log),
    [tasks, log],
  );

  // Mirror the latest resolved map so event handlers (updateTask) can read the
  // current effective state without replaying. Updated every render, so at the
  // time a handler fires it matches the committed `log` (= `prev`).
  const resolvedRef = useRef(resolvedById);
  resolvedRef.current = resolvedById;

  const tasksList = useMemo(
    () => getTaskList(resolvedById),
    [resolvedById],
  );

  const updateTask = useCallback((id: Id, patch: TaskPatch) => {
    // Build on the latest committed task (pre-roll-up) from the resolved map.
    const base = resolvedRef.current.get(id);
    if (!base) return;

    const nextTask: GanttTask = { ...base };
    if (patch.name !== undefined) nextTask.name = patch.name;
    if (patch.startDate) nextTask.startDate = patch.startDate;
    if (patch.endDate) nextTask.endDate = patch.endDate;
    if (patch.progress !== undefined) nextTask.progress = patch.progress;

    // Nothing actually changed → skip the empty undo step (and any reschedule).
    if (sameTask(nextTask, base)) return;

    const commands: TaskCommand[] = [{ type: "update", task: nextTask }];

    // Automatic forward scheduling: when a task moves, realign its dependents
    // so each dependency relationship stays satisfied, then cascade onward.
    // All reschedules join the same transaction → one undo step.
    const moved = patch.startDate !== undefined || patch.endDate !== undefined;
    if (moved && dependencyGraph.size > 0) {
      // Clone so scheduling doesn't mutate the shared resolved map.
      const current = new Map(resolvedRef.current);
      current.set(id, nextTask);
      const rescheduled = scheduleDependents(current, dependencyGraph, id);
      for (const task of rescheduled.values()) {
        commands.push({ type: "update", task });
      }
    }

    setLog((prev) => appendTransaction(prev, commands));
  }, [dependencyGraph]);

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
    setLog((prev) => appendTransaction(prev, [{ type: "delete", id }]));
    optionsRef.current.onTaskDelete?.(id);
  }, []);

  const undo = useCallback(() => {
    setLog((prev) =>
      prev.cursor > 0 ? { ...prev, cursor: prev.cursor - 1 } : prev,
    );
  }, []);

  const redo = useCallback(() => {
    setLog((prev) =>
      prev.cursor < prev.transactions.length
        ? { ...prev, cursor: prev.cursor + 1 }
        : prev,
    );
  }, []);

  const canUndo = log.cursor > 0;
  const canRedo = log.cursor < log.transactions.length;

  // Notify the parent of the resolved list, skipping the initial mount. Depends
  // only on the list itself: a new `onTasksChange` identity with an unchanged
  // list must not re-fire a duplicate notification.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    optionsRef.current.onTasksChange?.(tasksList);
  }, [tasksList]);

  return {
    tasksList,
    updateTask,
    createTask,
    deleteTask,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};
