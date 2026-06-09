import { memo } from "react";
import type { ColumnDef, GanttTask, Id } from "../../types";
import styles from "./TaskList.module.css";

interface TaskListRowProps {
  task: GanttTask;
  index: number;
  rowHeight: number;
  depth: number;
  isParent: boolean;
  isExpanded: boolean;
  onToggleExpand: (id: Id) => void;
  columns: ColumnDef[];
}

const INDENT_PX = 16;

export const TaskListRow = memo(function TaskListRow({
  task,
  index,
  rowHeight,
  depth,
  isParent,
  isExpanded,
  onToggleExpand,
  columns,
}: TaskListRowProps) {
  return (
    <div
      className={styles.row}
      style={{ top: index * rowHeight, height: rowHeight }}
    >
      {columns.map((col) => {
        const isName = col.key === "__name";
        return (
          <div
            key={col.key}
            className={`${styles.cell} ${isName ? styles.nameCell : ""}`}
            style={col.width ? { width: col.width, flexShrink: 0 } : { flex: "1 1 auto", minWidth: 100 }}
          >
            {isName ? (
              <span
                className={styles.nameContent}
                style={{ paddingLeft: depth * INDENT_PX }}
              >
                {isParent ? (
                  <button
                    className={styles.expandBtn}
                    onClick={() => onToggleExpand(task.id)}
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? "▾" : "▸"}
                  </button>
                ) : (
                  <span className={styles.expandPlaceholder} />
                )}
                {col.render(task)}
              </span>
            ) : (
              col.render(task)
            )}
          </div>
        );
      })}
    </div>
  );
});
