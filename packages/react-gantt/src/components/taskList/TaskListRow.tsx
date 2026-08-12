import { memo } from "react";
import type { ColumnDef, GanttTask, Id } from "../../types";
import { useGanttTaskActions } from "../../context/GanttContext";
import { TreeCell, type TreeCellSlotConfig } from "./TreeCell";
import styles from "./TaskList.module.css";

interface TaskListRowProps {
  task: GanttTask;
  rowHeight: number;
  rowIndex: number;
  depth: number;
  posinset: number;
  setsize: number;
  isParent: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: (id: Id) => void;
  onSelect: (id: Id) => void;
  columns: ColumnDef[];
  treeCell?: TreeCellSlotConfig;
}

const DEFAULT_COL_WIDTH = 100;

export const TaskListRow = memo(function TaskListRow({
  task,
  rowHeight,
  rowIndex,
  depth,
  posinset,
  setsize,
  isParent,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelect,
  columns,
  treeCell,
}: TaskListRowProps) {
  const { columnApi } = useGanttTaskActions();
  return (
    <div
      className={`${styles.row} ${isSelected ? styles.selected : ""}`}
      style={{ height: rowHeight }}
      onClick={() => onSelect(task.id)}
      role="row"
      aria-rowindex={rowIndex + 2}
      aria-level={depth + 1}
      aria-posinset={posinset}
      aria-setsize={setsize}
      aria-expanded={isParent ? isExpanded : undefined}
      aria-selected={isSelected || undefined}
    >
      {columns.map((col, index) => {
        return (
          <div
            key={col.key}
            className={`${styles.cell} ${col.isTreeColumn ? styles.treeCell : ""}`}
            style={{ width: col.width || DEFAULT_COL_WIDTH, flexShrink: 0 }}
            role={col.isTreeColumn ? "rowheader" : "gridcell"}
            aria-colindex={index + 1}
          >
            {col.isTreeColumn ? (
              <TreeCell
                taskId={task.id}
                depth={depth}
                isParent={isParent}
                isExpanded={isExpanded}
                onToggleExpand={onToggleExpand}
                slots={treeCell?.slots}
                slotProps={treeCell?.slotProps}
              >
                {col.render(task, columnApi)}
              </TreeCell>
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
