import type React from "react";
import type { ColumnDef, GanttTask, Scale } from "../../types";
import styles from "./TaskList.module.css";
import { DEFAULT_SCALES } from "../../core/scales";
import { addDays } from "../../core/dateUtils";

interface TaskListHeaderProps {
  columns: ColumnDef[];
  rowHeight: number;
  scales?: Scale[];
  onResizeStart: (key: string, startWidth: number, e: React.MouseEvent) => void;
}

export function TaskListHeader({ columns, rowHeight, scales = DEFAULT_SCALES, onResizeStart }: TaskListHeaderProps) {
  // Height tracks the calendar: one row per scale, +2 for its 1px top/bottom
  // borders. Both default to the shared DEFAULT_SCALES so the counts can't drift.
  const headerHeight = scales.length * rowHeight + 2;

  return (
    <div className={styles.header} style={{ minHeight: headerHeight, height: headerHeight }}>
      {columns.map((col) => (
        <div
          key={col.key}
          className={styles.headerCell}
          style={col.width ? { width: col.width, flexShrink: 0 } : { flex: "1 1 auto", minWidth: 100 }}
        >
          {col.header}
          <div
            className={styles.divider}
            onMouseDown={(e) => {
              // Read the rendered width from the DOM so flex (no explicit width)
              // columns snap cleanly to a fixed width on first drag.
              const cell = e.currentTarget.parentElement as HTMLElement;
              onResizeStart(col.key, cell.offsetWidth, e);
            }}
          />
        </div>
      ))}
    </div>
  );
}

/** Builds the task inserted by the actions-column "add after" button: a blank
 *  one-day task starting the day after the clicked row, under the same parent. */
function buildActionTask(task: GanttTask): GanttTask {
  const start = addDays(task.startDate, 1);
  return {
    id: `task-${Date.now()}`,
    name: "New task",
    startDate: start,
    endDate: start,
    duration: 1,
    progress: 0,
    type: "task",
    parentId: task.parentId ?? null,
  };
}

export const DEFAULT_COLUMNS: ColumnDef[] = [
    {
    key: "__action",
    header: "  ",
    width: 120,
    render: (task, api) => {
      return  <div style={{ display: "flex", gap: "8px"}}>
        <button
          title="Edit"
          onClick={(e) => {
            e.stopPropagation();
            api.editTask(task);
          }}
        >
          &#9998;
        </button>
        <button
          title="Add after"
          onClick={(e) => {
            e.stopPropagation();
            const created = buildActionTask(task);
            api.createTask(created, task.id);
            api.editTask(created);
          }}
        >
          &#10133;
        </button>
        <button
          title="Delete"
          style={{ fontSize: 9 }}
          onClick={(e) => {
            e.stopPropagation();
            api.deleteTask(task.id);
          }}
        >
          &#10060;
        </button>
      </div>
    }
  },
  {
    key: "__name",
    header: "Task Name",
    render: (task: GanttTask) => task.name,
    width: 200,
    isTreeColumn: true,
  },
  {
    key: "__start",
    header: "Start",
    width: 90,
    render: (task: GanttTask) => task.startDate.toLocaleDateString(),
  },
  {
    key: "__end",
    header: "End",
    width: 90,
    render: (task: GanttTask) => task.endDate?.toLocaleDateString() ?? "—",
  },
  {
    key: "__progress",
    header: "Progress, %",
    width: 90,
    render: (task: GanttTask) => `${task.progress ?? 0}%`,
  },

];
