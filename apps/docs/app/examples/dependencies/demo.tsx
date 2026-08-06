"use client";

import { useCallback, useState } from "react";
import { Gantt, type GanttTask, type TaskDependency } from "@am/react-gantt";
import { linkedDependencies, linkedTasks } from "@/lib/demo-tasks";

/**
 * `dependencies` is a controlled prop — the library never stores links itself.
 * You own the array and respond to onDependencyCreate / onDependencyDelete.
 *
 * Drag a bar and watch its successors follow: `updateTask` runs
 * `scheduleDependents`, and every cascaded reschedule joins the *same* undo
 * transaction, so one Ctrl+Z reverts the whole chain.
 */
export function DependenciesDemo() {
  const [dependencies, setDependencies] = useState<TaskDependency[]>(linkedDependencies);
  const [tasks, setTasks] = useState<GanttTask[]>(linkedTasks);

  const handleCreate = useCallback((dep: TaskDependency) => {
    setDependencies((prev) => [...prev, dep]);
  }, []);

  const handleDelete = useCallback((dep: TaskDependency) => {
    setDependencies((prev) => prev.filter((d) => !(d.from === dep.from && d.to === dep.to)));
  }, []);

  return (
    <div>
      <p style={{ margin: 0, padding: "8px 12px", fontSize: 12, color: "#475569" }}>
        Hover a bar to reveal its connector handles, then drag one onto another
        bar. Click a link to select it, then press Delete.
      </p>
      <Gantt
        tasks={tasks}
        dependencies={dependencies}
        onTasksChange={setTasks}
        onDependencyCreate={handleCreate}
        onDependencyDelete={handleDelete}
        height={300}
      />
    </div>
  );
}
