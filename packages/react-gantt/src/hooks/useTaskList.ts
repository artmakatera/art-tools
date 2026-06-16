import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeLog, GanttTask, Id, TaskCommand, TaskDependency } from "../types";
import { type DatePatch } from "../core/barUtils";
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

  const tasksList = useMemo(
    () => getTaskList(tasks, log),
    [tasks, log],
  );


  const updateTask = useCallback((id: Id, patch: DatePatch) => {
    setLog((prev) => {
      // Resolve the current effective state so the edit builds on the latest
      // committed task (including any prior create/update).
      const current = new Map<Id, GanttTask>(
        resolveCommittedTasks(tasks, prev).map((t) => [t.id, t]),
      );
      const base = current.get(id);
      if (!base) return prev;

      const nextTask: GanttTask = { ...base };
      if (patch.startDate) nextTask.startDate = patch.startDate;
      if (patch.endDate) nextTask.endDate = patch.endDate;
      if (patch.progress !== undefined) nextTask.progress = patch.progress;

      const commands: TaskCommand[] = [{ type: "update", task: nextTask }];

      // Automatic forward scheduling: when a task moves, realign its dependents
      // so each dependency relationship stays satisfied, then cascade onward.
      // All reschedules join the same transaction → one undo step.
      const moved = patch.startDate !== undefined || patch.endDate !== undefined;
      if (moved && dependencyGraph.size > 0) {
        current.set(id, nextTask);
        const rescheduled = scheduleDependents(current, dependencyGraph, id);
        for (const task of rescheduled.values()) {
          commands.push({ type: "update", task });
        }
      }

      return appendTransaction(prev, commands);
    });
  }, [tasks, dependencyGraph]);

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
