import { useCallback, useMemo, useState } from "react";
import type { CommittedOverrides, GanttTask, Id, TaskCommand, TaskDependency } from "../types";
import {  type DatePatch } from "../core/barUtils";
import { getTaskList, resolveCommittedTasks } from "../core/prepareData";
import { buildDependencyGraph, scheduleDependents } from "../core/scheduling";

/** Append an `update` command for `task` to its command history in `changes`. */
function commitUpdate(
  changes: CommittedOverrides,
  task: GanttTask,
): CommittedOverrides {
  const commands = changes[task.id] ?? [];
  const nextCommand: TaskCommand = { type: "update", task };
  return { ...changes, [task.id]: [...commands, nextCommand] };
}

export const useTaskList = (
  tasks: GanttTask[],
  dependencies: TaskDependency[] = [],
) => {
  const [committedChanges, setCommittedChanges] = useState<CommittedOverrides>({});

  // Built once per dependency list and reused across every commit.
  const dependencyGraph = useMemo(
    () => buildDependencyGraph(dependencies),
    [dependencies],
  );

  const tasksList = useMemo(
    () => getTaskList(tasks, committedChanges),
    [tasks, committedChanges],
  );

  const updateTask = useCallback((id: Id, patch: DatePatch) => {

    setCommittedChanges((prev) => {
      const original = tasks.find((t) => t.id === id);
      const commands = prev[id] ?? [];
      const lastCommand = commands[commands.length - 1];
      const base =
        lastCommand && lastCommand.type !== "delete"
          ? lastCommand.task
          : original;
      if (!base) return prev;
      const nextTask: GanttTask = { ...base };
      if (patch.startDate) nextTask.startDate = patch.startDate;
      if (patch.endDate) nextTask.endDate = patch.endDate;
      if (patch.progress !== undefined) nextTask.progress = patch.progress;

      let next = commitUpdate(prev, nextTask);

      // Automatic forward scheduling: when a task moves, realign its dependents
      // so each dependency relationship stays satisfied, then cascade onward.
      const moved = patch.startDate !== undefined || patch.endDate !== undefined;
      if (moved && dependencyGraph.size > 0) {
        const current = new Map<Id, GanttTask>(
          resolveCommittedTasks(tasks, prev).map((t) => [t.id, t]),
        );
        current.set(id, nextTask);
        const rescheduled = scheduleDependents(current, dependencyGraph, id);
        for (const task of rescheduled.values()) {
          next = commitUpdate(next, task);
        }
      }

      return next;
    });
  }, [tasks, dependencyGraph]);

  return { tasksList, updateTask };

}