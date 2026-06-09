import { useState } from "react";
import { Gantt, GanttProvider, TaskList, GanttGrid, type TaskDependency } from "@am/react-gantt"
import "@am/react-gantt/style.css";
import { mockTasks, mockDependencies } from "./mock";

// Example 1: convenience <Gantt> with built-in TaskList panel
function GanttWithTaskList() {
  const [dependencies, setDependencies] = useState<TaskDependency[]>(mockDependencies);

  return (
    <Gantt
      tasks={mockTasks}
      dependencies={dependencies}
      colWidth={60}
      rowHeight={40}
      columns={[]}
      onDependencyCreate={(dep) => setDependencies((prev) => [...prev, dep])}
      onDependencyDelete={(dep) =>
        setDependencies((prev) =>
          prev.filter((d) => !(d.from === dep.from && d.to === dep.to))
        )
      }
    />
  );
}

// Example 2: composable API — TaskList + GanttGrid composed manually
function ComposableGantt() {
  const [dependencies, setDependencies] = useState<TaskDependency[]>(mockDependencies);

  return (
    <GanttProvider
      tasks={mockTasks}
      dependencies={dependencies}
      colWidth={60}
      rowHeight={40}
      onDependencyCreate={(dep) => setDependencies((prev) => [...prev, dep])}
      onDependencyDelete={(dep) =>
        setDependencies((prev) =>
          prev.filter((d) => !(d.from === dep.from && d.to === dep.to))
        )
      }
    >
      <div style={{ display: "flex", flexDirection: "row" }}>
        <TaskList />
        <GanttGrid />
      </div>
    </GanttProvider>
  );
}

export function App() {
  const [view, setView] = useState<"simple" | "composable">("simple");

  return (
    <div style={{ margin: "0 auto", maxWidth: "1200px", padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <button onClick={() => setView("simple")} style={{ fontWeight: view === "simple" ? "bold" : "normal" }}>
          Simple (with TaskList)
        </button>
        <button onClick={() => setView("composable")} style={{ fontWeight: view === "composable" ? "bold" : "normal" }}>
          Composable API
        </button>
      </div>

      {view === "simple" ? <GanttWithTaskList /> : <ComposableGantt />}
    </div>
  );
}
