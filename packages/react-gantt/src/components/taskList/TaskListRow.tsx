import { memo } from "react";
import type { ColumnDef, GanttTask, Id } from "../../types";
import { useGanttTaskActions } from "../../context/GanttContext";
import { TreeCell, type TreeCellSlotConfig } from "./TreeCell";
import styles from "./TaskList.module.css";

interface TaskListRowProps {
  task: GanttTask;
  rowHeight: number;
  /** Absolute 1-based `aria-rowindex`, counting the header as row 1. */
  rowIndex: number;
  depth: number;
  posinset: number;
  setsize: number;
  isParent: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  /** True for this pane's single roving tab stop. */
  isFocused: boolean;
  /**
   * Set only for a row pinned outside the virtualization window (it holds the
   * keyboard cursor). Positions it absolutely, since the in-flow rows are laid
   * out between two sizing spacers.
   */
  offsetTop?: number;
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
  isFocused,
  offsetTop,
  onToggleExpand,
  onSelect,
  columns,
  treeCell,
}: TaskListRowProps) {
  const { columnApi } = useGanttTaskActions();
  return (
    <div
      className={`${styles.row} ${isSelected ? styles.selected : ""}`}
      style={
        offsetTop === undefined
          ? { height: rowHeight }
          : { height: rowHeight, position: "absolute", top: offsetTop, left: 0, right: 0 }
      }
      onClick={() => onSelect(task.id)}
      role="row"
      tabIndex={isFocused ? 0 : -1}
      aria-rowindex={rowIndex}
      aria-level={depth + 1}
      aria-posinset={posinset}
      aria-setsize={setsize}
      aria-selected={isSelected}
      // Only branch rows carry expanded state; leaves must omit it entirely
      // rather than report `false`, which would announce them as collapsed.
      aria-expanded={isParent ? isExpanded : undefined}
      data-task-id={task.id}
      data-gantt-slot="row"
    >
      {columns.map((col, colIndex) => {
        return (
          <div
            key={col.key}
            className={`${styles.cell} ${col.isTreeColumn ? styles.treeCell : ""}`}
            style={{ width: col.width || DEFAULT_COL_WIDTH, flexShrink: 0 }}
            role="gridcell"
            aria-colindex={colIndex + 1}
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
