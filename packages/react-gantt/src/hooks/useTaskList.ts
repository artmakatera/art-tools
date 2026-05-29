import { useCallback, useMemo, useState } from "react";
import type { CommittedOverrides, GanttTask, Id, TaskCommand } from "../types";
import {  type DatePatch } from "../core/barUtils";
import { getTaskList } from "../core/prepareData";



export const useTaskList = (tasks: GanttTask[]) => {
  const [committedChanges, setCommittedChanges] = useState<CommittedOverrides>({});

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
      const nextCommand: TaskCommand = { type: "update", task: nextTask };
      return { ...prev, [id]: [...commands, nextCommand] };
    });
  }, [tasks]);

  return { tasksList, updateTask };

}