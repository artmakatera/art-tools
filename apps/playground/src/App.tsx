import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Gantt, type GanttHandle, type GanttTask, type TaskDependency, type TaskPatch } from "@am/react-gantt"
import "@am/react-gantt/style.css";
import { generateMockData } from "./mockGenerator";
import { TaskEditModal } from "./TaskEditModal";

// Stable empty reference so the Gantt's `columns` prop doesn't change identity.

// Example 1: convenience <Gantt> with built-in TaskList panel.
// `mockTasks` is the stable seed; all create/delete/edit/undo flow through the
// internal change log, so we never feed the resolved list back into `tasks`.
function GanttWithTaskList() {
  // How many tasks to generate, and a bump counter to reshuffle with a new seed.
  const [count, setCount] = useState(50);
  const [seed, setSeed] = useState(1);
  const { tasks, dependencies: seededDeps } = useMemo(
    () => generateMockData(count, { seed }),
    [count, seed],
  );

  const [dependencies, setDependencies] = useState<TaskDependency[]>(seededDeps);
  // When the generated dataset changes, reset the live dependency state to match.
  useEffect(() => setDependencies(seededDeps), [seededDeps]);

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
        <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
          Tasks:
          <input
            type="number"
            min={1}
            max={1000}
            value={count}
            onChange={(e) => setCount(Math.min(1000, Math.max(1, Number(e.target.value) || 1)))}
            style={{ width: 72 }}
          />
        </label>
        <button onClick={() => setSeed((s) => s + 1)}>Regenerate</button>
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
      <Gantt
        key={`${count}-${seed}`}
        apiRef={ganttRef}
        tasks={tasks}
        dependencies={dependencies}
        colWidth={60}
        rowHeight={40}
        height={400}
        onTaskEdit={setEditing}
        onTasksChange={handleTasksChange}
        onDependencyCreate={handleDependencyCreate}
        onDependencyDelete={handleDependencyDelete}
      />
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
