import type { ColumnDef, GanttTask, Scale } from "../../types";
import styles from "./TaskList.module.css";
import { DEFAULT_SCALES } from "../../core/scales";

interface TaskListHeaderProps {
  columns: ColumnDef[];
  rowHeight: number;
  scales?: Scale[];
}

export function TaskListHeader({ columns, rowHeight, scales = DEFAULT_SCALES }: TaskListHeaderProps) {
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
        </div>
      ))}
    </div>
  );
}

export const DEFAULT_COLUMNS: ColumnDef[] = [
  {
    key: "__name",
    header: "Task Name",
    render: (task: GanttTask) => task.name,
    width: 200,
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
