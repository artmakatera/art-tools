"use client";

import { useState } from "react";
import { Gantt, type ColumnDef, type GanttTask } from "@art-tools/react-gantt";
import { simpleTasks } from "@/lib/demo-tasks";

const STATUS = (progress: number) =>
  progress === 100 ? "Done" : progress > 0 ? "In progress" : "Not started";

// Defined at module scope so the array identity is stable across renders.
const columns: ColumnDef[] = [
  {
    key: "name",
    header: "Task",
    width: 190,
    // Exactly one column may be the tree column: it gets the indent and the
    // expand/collapse toggle.
    isTreeColumn: true,
    render: (task) => task.name,
  },
  {
    key: "status",
    header: "Status",
    width: 110,
    render: (task) => {
      const label = STATUS(task.progress ?? 0);
      return (
        <span
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 999,
            background:
              label === "Done" ? "#dcfce7" : label === "In progress" ? "#dbeafe" : "#f1f5f9",
            color: label === "Done" ? "#166534" : label === "In progress" ? "#1e40af" : "#475569",
          }}
        >
          {label}
        </span>
      );
    },
  },
  {
    key: "duration",
    header: "Days",
    width: 60,
    render: (task) => {
      if (!task.endDate) {
        return "—";
      }
      const ms = task.endDate.getTime() - task.startDate.getTime();
      return Math.round(ms / 86_400_000) + 1;
    },
  },
  {
    key: "actions",
    header: "",
    width: 70,
    // The second argument is the ColumnApi: the imperative handle plus
    // `editTask`, so a cell can mutate the chart directly.
    render: (task, api) => (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation(); // don't also select the row
          api.updateTask(task.id, { progress: 100 });
        }}
        style={{ fontSize: 11, cursor: "pointer" }}
      >
        Complete
      </button>
    ),
  },
];

export function CustomColumnsDemo() {
  const [tasks] = useState<GanttTask[]>(simpleTasks);
  return <Gantt tasks={tasks} columns={columns} height={320} defaultTaskListWidth={430} />;
}
