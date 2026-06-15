import { useState } from "react";
import { Gantt,  type TaskDependency } from "@am/react-gantt"
import "@am/react-gantt/style.css";
import { mockTasks, mockDependencies } from "./mock";

// Example 1: convenience <Gantt> with built-in TaskList panel
function GanttWithTaskList() {
  const [dependencies, setDependencies] = useState<TaskDependency[]>(mockDependencies);
  const [tasks, setTasks] = useState(mockTasks)

  return (
    <Gantt
      tasks={tasks}
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


export function App() {

  return (
    <div style={{ margin: "0 auto", maxWidth: "1200px", padding: "16px", fontFamily: "system-ui, sans-serif" }}>
 

      <GanttWithTaskList /> 
    </div>
  );
}
