import { useCallback, useRef, useState } from "react";
import { Gantt, type ColumnDef, type GanttHandle, type GanttTask, type TaskDependency, type TaskPatch } from "@am/react-gantt"
import "@am/react-gantt/style.css";
import { mockTasks, mockDependencies } from "./mock";
import { TaskEditModal } from "./TaskEditModal";

// Stable empty reference so the Gantt's `columns` prop doesn't change identity.
const NO_COLUMNS: ColumnDef[] = [];

// Example 1: convenience <Gantt> with built-in TaskList panel.
// `mockTasks` is the stable seed; all create/delete/edit/undo flow through the
// internal change log, so we never feed the resolved list back into `tasks`.
function GanttWithTaskList() {
  const [dependencies, setDependencies] = useState<TaskDependency[]>(mockDependencies);
  const ganttRef = useRef<GanttHandle>(null);
  const [selected, setSelected] = useState<GanttTask | null>(null);
  const [editing, setEditing] = useState<GanttTask | null>(null);

  const addTask = useCallback(() => {
    // Start from the selected task (fall back to a default); span exactly one
    // day (endDate inclusive), progress 0. Populate every GanttTask field.
    const start = selected ? new Date(selected.startDate) : new Date("2022-01-12");
    const end = new Date(start); // 1 day: endDate is the inclusive last day
    const task: GanttTask = {
      id: `new-${Date.now()}`,
      name: "New task",
      startDate: start,
      endDate: end,
      duration: 1,
      progress: 0,
      type: "task",
      parentId: selected?.parentId ?? null,
    };
    // afterId omitted → appended at end; pass the selection to insert after it.
    ganttRef.current?.createTask(task, selected?.id ?? undefined);
    // Immediately open the edit dialog on the just-created task.
    setEditing(task);
  }, [selected]);

  const editSelected = useCallback(() => {
    if (selected) setEditing(selected);
  }, [selected]);

  const deleteSelected = useCallback(() => {
    if (selected) ganttRef.current?.deleteTask(selected.id);
  }, [selected]);

  const undo = useCallback(() => ganttRef.current?.undo(), []);
  const redo = useCallback(() => ganttRef.current?.redo(), []);

  const handleTaskClick = useCallback((task: GanttTask) => setSelected(task), []);
  const clearSelection = useCallback(() => setSelected(null), []);
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
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={addTask}>
          Add task {selected ? "after selected" : "at end"}
        </button>
        <button disabled={!selected} onClick={editSelected}>
          Edit selected
        </button>
        <button onClick={deleteSelected}>
          Delete selected
        </button>
        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
      </div>
      <Gantt
        apiRef={ganttRef}
        tasks={mockTasks}
        dependencies={dependencies}
        colWidth={60}
        rowHeight={40}
        columns={NO_COLUMNS}
        onTaskClick={handleTaskClick}
        onTaskDelete={clearSelection}
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
