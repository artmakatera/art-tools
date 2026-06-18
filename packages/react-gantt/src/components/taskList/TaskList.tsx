import { useCallback, useMemo } from "react";
import { useGanttConfig, useGanttScroll, useGanttTask } from "../../context/GanttContext";
import type { ColumnDef, Id } from "../../types";
import { TaskListHeader, DEFAULT_COLUMNS } from "./TaskListHeader";
import { TaskListRow } from "./TaskListRow";
import styles from "./TaskList.module.css";

interface TaskListProps {
  columns?: ColumnDef[];
}

export function TaskList({ columns = [] }: TaskListProps) {
  const { visibleTasks, tasksList, expandedIds, parentIds, toggleExpand, selectedId, setSelectedId, onTaskClick } = useGanttTask();
  const { rowHeight, scales, height } = useGanttConfig();
  const { taskListRef, onTaskListScroll } = useGanttScroll();

  const allColumns = useMemo(() => columns.length > 0 ?  columns : DEFAULT_COLUMNS, [columns]);

  // Selecting a row drives both the built-in highlight and the consumer's
  // onTaskClick, so external selection state (e.g. a "Delete selected" toolbar) stays in sync.
  const handleSelect = useCallback((id: Id) => {
    setSelectedId(id);
    const task = tasksList.find((t) => t.id === id);
    if (task) onTaskClick?.(task);
  }, [setSelectedId, tasksList, onTaskClick]);

  // Depth map: how many levels deep each task is
  const depthMap = useMemo(() => {
    const map = new Map<Id, number>();
    for (const t of visibleTasks) {
      const parentDepth = t.parentId != null ? (map.get(t.parentId) ?? 0) : -1;
      map.set(t.id, parentDepth + 1);
    }
    return map;
  }, [visibleTasks]);

  // No fixed height → the body grows to fit every row. With a height, the body
  // flexes to fill the space left by the header and scrolls (synced to the grid).
  const bodyHeight = tasksList.length * rowHeight;
  const bodyStyle = height !== undefined ? { flex: "1 1 auto", minHeight: 0 } : { height: bodyHeight };

  return (
    <div className={styles.taskList} style={height !== undefined ? { height } : undefined}>
      <TaskListHeader columns={allColumns} rowHeight={rowHeight} scales={scales} />
      <div
        ref={taskListRef}
        className={styles.body}
        style={bodyStyle}
        onScroll={onTaskListScroll}
      >
        <div className={styles.rows} style={{ height: visibleTasks.length * rowHeight }}>
          {visibleTasks.map((task, index) => (
            <TaskListRow
              key={task.id}
              task={task}
              index={index}
              rowHeight={rowHeight}
              depth={depthMap.get(task.id) ?? 0}
              isParent={parentIds.has(task.id)}
              isExpanded={expandedIds.has(task.id)}
              isSelected={selectedId === task.id}
              onToggleExpand={toggleExpand}
              onSelect={handleSelect}
              columns={allColumns}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
