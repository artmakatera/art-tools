import type { ColumnDef, GanttTask, Scale } from "../../types";
import styles from "./TaskList.module.css";

const DEFAULT_SCALES: Scale[] = [
  { unit: "month", step: 1, format: () => "" },
  { unit: "day", step: 1, format: () => "" },
];

interface TaskListHeaderProps {
  columns: ColumnDef[];
  rowHeight: number;
  scales?: Scale[];
}

export function TaskListHeader({ columns, rowHeight, scales = DEFAULT_SCALES }: TaskListHeaderProps) {
  // +2 matches Calendar's 1px top + 1px bottom border around its rows
  const headerHeight = scales.length * rowHeight + 2;

  return (
    <div className={styles.header} style={{ height: headerHeight }}>
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
    header: "%",
    width: 50,
    render: (task: GanttTask) => `${task.progress ?? 0}%`,
  },
];
