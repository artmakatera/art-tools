"use client";

import { useCallback, useRef, useState } from "react";
import { Gantt, type GanttHandle, type GanttTask } from "@am-tools/react-gantt";
import { simpleTasks } from "@/lib/demo-tasks";

/**
 * `apiRef` exposes the same operations the chart uses internally, so a toolbar
 * outside it can drive the chart without lifting its state.
 *
 * Every mutation goes through the change log, so undo/redo covers them all —
 * including the cascade that `updateTask` triggers on dependents.
 */
export function ImperativeApiDemo() {
  const api = useRef<GanttHandle>(null);
  const [tasks, setTasks] = useState<GanttTask[]>(simpleTasks);
  const [n, setN] = useState(0);

  const addTask = useCallback(() => {
    const id = `added-${n}`;
    setN((v) => v + 1);
    // createTask commits synchronously, then selects and scrolls to the new row.
    api.current?.createTask({
      id,
      name: `New task ${n + 1}`,
      startDate: new Date(2026, 0, 6 + n),
      endDate: new Date(2026, 0, 9 + n),
      progress: 0,
      type: "task",
      parentId: null,
    });
  }, [n]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: "8px 12px",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <button type="button" onClick={addTask}>
          Add task
        </button>
        <button type="button" onClick={() => api.current?.undo()}>
          Undo
        </button>
        <button type="button" onClick={() => api.current?.redo()}>
          Redo
        </button>
        <button
          type="button"
          // `horizontal: true` because this chart fits vertically — the interesting
          // axis here is the timeline. A bare `revealTask(id)` scrolls the rows.
          onClick={() => api.current?.revealTask("ship", { horizontal: true })}
        >
          Scroll to “Ship it”
        </button>
        <button type="button" onClick={() => api.current?.updateTask("build", { progress: 100 })}>
          Complete “Build feature”
        </button>
        <button type="button" onClick={() => api.current?.zoomIn()}>
          Zoom in
        </button>
        <button type="button" onClick={() => api.current?.zoomOut()}>
          Zoom out
        </button>
      </div>
      <Gantt apiRef={api} tasks={tasks} onTasksChange={setTasks} height={320} />
    </div>
  );
}
