import { useRef, useState } from "react";
import { Gantt, type GanttHandle, type GanttTask, type TaskDependency } from "@am/react-gantt"
import "@am/react-gantt/style.css";
import { mockTasks, mockDependencies } from "./mock";

// Example 1: convenience <Gantt> with built-in TaskList panel.
// `mockTasks` is the stable seed; all create/delete/edit/undo flow through the
// internal change log, so we never feed the resolved list back into `tasks`.
function GanttWithTaskList() {
  const [dependencies, setDependencies] = useState<TaskDependency[]>(mockDependencies);
  const ganttRef = useRef<GanttHandle>(null);
  const [selected, setSelected] = useState<GanttTask | null>(null);

  const addTask = () => {
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
  };

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={addTask}>
          Add task {selected ? "after selected" : "at end"}
        </button>
        <button onClick={() => selected && ganttRef.current?.deleteTask(selected.id)}>
          Delete selected
        </button>
        <button onClick={() => ganttRef.current?.undo()}>Undo</button>
        <button onClick={() => ganttRef.current?.redo()}>Redo</button>
      </div>
      <Gantt
        apiRef={ganttRef}
        tasks={mockTasks}
        dependencies={dependencies}
        colWidth={60}
        rowHeight={40}
        columns={[]}
        onTaskClick={(task) => setSelected(task)}
        onTaskDelete={() => setSelected(null)}
        onTasksChange={(next) => console.log("tasks changed:", next.length)}
        onDependencyCreate={(dep) => setDependencies((prev) => [...prev, dep])}
        onDependencyDelete={(dep) =>
          setDependencies((prev) =>
            prev.filter((d) => !(d.from === dep.from && d.to === dep.to))
          )
        }
      />
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
