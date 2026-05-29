import { useCallback, useMemo, useState } from "react";
import { Grid } from "./components/grid/Grid";
import type {
  CommittedOverrides,
  GanttProps,
  GanttTask,
  Id,
  Overrides,
  TaskCommand,
} from "./types";
import { getTaskList } from "./core/prepareData";
import { applyPatch, type DatePatch } from "./core/barUtils";



export function Gantt({ tasks, rowHeight = 32, colWidth }: GanttProps) {
  const [commitedChanges, setCommitedChanges] = useState<CommittedOverrides>({});
  const [overrides, setOverrides] = useState<Overrides>({});

  const tasksList = useMemo(
    () => getTaskList(tasks, commitedChanges),
    [tasks, commitedChanges],
  );

  const updateTask = useCallback((id: Id, patch: DatePatch) => {

    setOverrides((prev) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return prev;
      return { ...prev, [id]: applyPatch(task, prev[id] ?? {}, patch) };
    });
  }, [tasks]);

  const commitTask = useCallback((id: Id, patch: DatePatch) => {
    setCommitedChanges((prev) => {
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
    setOverrides((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, [tasks]);

  return (
    <Grid
      tasks={tasksList}
      colWidth={colWidth}
      rowHeight={rowHeight}
      overrides={overrides}
      onUpdateTask={updateTask}
      onCommitTask={commitTask}
    />
  );
}
