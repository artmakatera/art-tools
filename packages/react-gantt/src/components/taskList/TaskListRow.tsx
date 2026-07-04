import { memo } from "react";
import type { ColumnDef, GanttTask, Id } from "../../types";
import { useGanttTaskActions } from "../../context/GanttContext";
import styles from "./TaskList.module.css";

interface TaskListRowProps {
  task: GanttTask;
  rowHeight: number;
  depth: number;
  isParent: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: (id: Id) => void;
  onSelect: (id: Id) => void;
  columns: ColumnDef[];
}

const INDENT_PX = 16;

export const TaskListRow = memo(function TaskListRow({
  task,
  rowHeight,
  depth,
  isParent,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelect,
  columns,
}: TaskListRowProps) {
  const { columnApi } = useGanttTaskActions();
  return (
    <div
      className={`${styles.row} ${isSelected ? styles.selected : ""}`}
      style={{ height: rowHeight }}
      onClick={() => onSelect(task.id)}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpand(task.id);
                    }}
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? "▾" : "▸"}
                  </button>
                ) : (
                  <span className={styles.expandPlaceholder} />
                )}
                {col.render(task, columnApi)}
              </span>
            ) : (
              col.render(task, columnApi)
            )}
          </div>
        );
      })}
    </div>
  );
});

TaskListRow.displayName = "TaskListRow";
