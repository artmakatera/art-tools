import { Suspense, lazy, useCallback, useRef, useState } from "react";
import type { GanttHandle, GanttTask, TaskDependency, TaskPatch } from "@am/react-gantt"
import "@am/react-gantt/style.css";
import { generateMockData } from "./mockGenerator";
import { TaskEditModal } from "./TaskEditModal";

// Code-split the Gantt into its own async chunk so the page shell paints
// immediately and the <Suspense> boundary below shows a fallback while it loads.
const Gantt = lazy(() =>
  import("@am/react-gantt").then((m) => ({ default: m.Gantt })),
);

// Stable empty reference so the Gantt's `columns` prop doesn't change identity.

// Example 1: convenience <Gantt> with built-in TaskList panel.
// `mockTasks` is the stable seed; all create/delete/edit/undo flow through the
// internal change log, so we never feed the resolved list back into `tasks`.

const count = 10000;
const seed = 1;

const mockData = generateMockData(count, { seed, yearsRange: [2012, 2025] });
function GanttWithTaskList() {
  // How many tasks to generate, and a bump counter to reshuffle with a new seed.

  // The number input updates `count` on every keystroke, but regenerating the
  // dataset and remounting <Gantt> (its `key` resets the edit log) is expensive.
  // Defer that work so the input stays responsive and rapid keystrokes coalesce
  // into one rebuild instead of one per digit.
  const { tasks, dependencies: seededDeps } = mockData

  const [dependencies, setDependencies] = useState<TaskDependency[]>(seededDeps);


  const ganttRef = useRef<GanttHandle>(null);
  const [editing, setEditing] = useState<GanttTask | null>(null);

  const addTask = useCallback(() => {
    // Start from the selected task (fall back to a default); span exactly one
    // day (endDate inclusive), progress 0. Populate every GanttTask field.
    const start =  new Date("2022-01-12");
    const end = new Date(start); // 1 day: endDate is the inclusive last day
    const task: GanttTask = {
      id: `new-${Date.now()}`,
      name: "New task",
      startDate: start,
      endDate: end,
      duration: 1,
      progress: 0,
      type: "task",
      parentId: null,
    };
    // afterId omitted → appended at end; pass the selection to insert after it.
    ganttRef.current?.createTask(task);
    // Immediately open the edit dialog on the just-created task.
    setEditing(task);
  }, []);


  const undo = useCallback(() => ganttRef.current?.undo(), []);
  const redo = useCallback(() => ganttRef.current?.redo(), []);

  const handleTasksChange = useCallback(
    (next: GanttTask[]) => console.log("tasks changed:", next.length),
    [],
  );

  const handleDependencyCreate = useCallback(
    (dep: TaskDependency) => setDependencies((prev) => [...prev, dep]),
    [],
  );
  const handleDependencyDelete = useCallback(
    (dep: TaskDependency) =>
      setDependencies((prev) =>
        prev.filter((d) => !(d.from === dep.from && d.to === dep.to))
      ),
    [],
  );

  const closeEdit = useCallback(() => setEditing(null), []);
  const saveEdit = useCallback(
    (patch: TaskPatch) => {
      if (editing) ganttRef.current?.updateTask(editing.id, patch);
      setEditing(null);
    },
    [editing],
  );

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
        <span style={{ color: "#666" }}>
          {tasks.length} tasks · {dependencies.length} links
        </span>
        <span style={{ width: 1, height: 20, background: "#ddd" }} />
        <button onClick={addTask}>
          Add task 
        </button>
        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
      </div>
      <Suspense
        fallback={
          <div style={{ padding: 16, color: "#666" }}>Loading Gantt…</div>
        }
      >
        <Gantt
          apiRef={ganttRef}
          tasks={tasks}
          dependencies={dependencies}
          colWidth={60}
          rowHeight={40}
          height={500}
          onTaskEdit={setEditing}
          onTasksChange={handleTasksChange}
          onDependencyCreate={handleDependencyCreate}
          onDependencyDelete={handleDependencyDelete}
        />
      </Suspense>
      {editing && (
        <TaskEditModal
          task={editing}
          onClose={closeEdit}
          onSave={saveEdit}
        />
      )}
    </>
  );
}


export function App() {

  return (
    <div style={{ margin: "0 auto", maxWidth: "1200px", padding: "16px", fontFamily: "system-ui, sans-serif" }}>


      <GanttWithTaskList />
    </div>
  );
}
