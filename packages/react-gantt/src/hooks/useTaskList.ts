import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeLog, GanttTask, Id, TaskCommand, TaskDependency, TaskPatch } from "../types";
import { getTaskList, resolveCommittedTasks } from "../core/prepareData";
import { buildDependencyGraph, scheduleDependents } from "../core/scheduling";

const EMPTY_LOG: ChangeLog = { transactions: [], cursor: 0 };

/** Drop any redo branch, append `commands` as one transaction, advance the cursor. */
function appendTransaction(log: ChangeLog, commands: TaskCommand[]): ChangeLog {
  const kept = log.transactions.slice(0, log.cursor);
  return { transactions: [...kept, commands], cursor: kept.length + 1 };
}

export interface UseTaskListOptions {
  onTaskCreate?: (task: GanttTask, afterId?: Id | null) => void;
  onTaskDelete?: (id: Id) => void;
  onTasksChange?: (tasks: GanttTask[]) => void;
}

export const useTaskList = (
  tasks: GanttTask[],
  dependencies: TaskDependency[] = [],
  options: UseTaskListOptions = {},
) => {
  const { onTaskCreate, onTaskDelete, onTasksChange } = options;
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
    setLog((prev) => appendTransaction(prev, [{ type: "create", task, afterId }]));
    onTaskCreate?.(task, afterId);
  }, [onTaskCreate]);

  const deleteTask = useCallback((id: Id) => {
    setLog((prev) => appendTransaction(prev, [{ type: "delete", id }]));
    onTaskDelete?.(id);
  }, [onTaskDelete]);

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

  // Notify the parent of the resolved list, skipping the initial mount.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    onTasksChange?.(tasksList);
  }, [tasksList, onTasksChange]);

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
