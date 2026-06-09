import { useMemo } from "react";
import { useGanttContext } from "../../context/GanttContext";
import type { ColumnDef, Id } from "../../types";
import { TaskListHeader, buildBuiltInColumns } from "./TaskListHeader";
import { TaskListRow } from "./TaskListRow";
import styles from "./TaskList.module.css";

interface TaskListProps {
  columns?: ColumnDef[];
}

export function TaskList({ columns = [] }: TaskListProps) {
  const {
    visibleTasks,
    tasksList,
    rowHeight,
    scales,
    expandedIds,
    parentIds,
    toggleExpand,
    taskListRef,
    onTaskListScroll,
  } = useGanttContext();

  const allColumns = useMemo(() => [...buildBuiltInColumns(), ...columns], [columns]);

  // Depth map: how many levels deep each task is
  const depthMap = useMemo(() => {
    const map = new Map<Id, number>();
    for (const t of visibleTasks) {
      const parentDepth = t.parentId != null ? (map.get(t.parentId) ?? 0) : -1;
      map.set(t.id, parentDepth + 1);
    }
    return map;
  }, [visibleTasks]);

  const bodyHeight = tasksList.length * rowHeight;

  return (
    <div className={styles.taskList}>
      <TaskListHeader columns={allColumns} rowHeight={rowHeight} scales={scales} />
      <div
        ref={taskListRef}
        className={styles.body}
        style={{ height: bodyHeight }}
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
              onToggleExpand={toggleExpand}
              columns={allColumns}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
