"use client";

import { useCallback, useState } from "react";
import { Gantt, type GanttTask, type TaskDependency } from "@art-tools/react-gantt";
import { criticalPathDependencies, criticalPathTasks } from "@/lib/demo-tasks";

/**
 * `criticalPath` is computed from the *actual* committed schedule, not a
 * hypothetical earliest-possible one (ADR-023) — so Research/Prototype, which
 * finishes nine days before Launch, never lights up even though it shares
 * Kickoff with the critical chain. Drag Design or Build and watch the
 * highlight follow whichever chain is currently pinning Launch's date; it
 * recomputes on commit, same cadence as the dependency cascade itself.
 */
export function CriticalPathDemo() {
  const [tasks, setTasks] = useState<GanttTask[]>(criticalPathTasks);
  const [dependencies, setDependencies] = useState<TaskDependency[]>(criticalPathDependencies);

  const handleCreate = useCallback((dep: TaskDependency) => {
    setDependencies((prev) => [...prev, dep]);
  }, []);

  const handleDelete = useCallback((dep: TaskDependency) => {
    setDependencies((prev) => prev.filter((d) => !(d.from === dep.from && d.to === dep.to)));
  }, []);

  return (
    <Gantt
      tasks={tasks}
      dependencies={dependencies}
      criticalPath
      onTasksChange={setTasks}
      onDependencyCreate={handleCreate}
      onDependencyDelete={handleDelete}
      height={340}
    />
  );
}
