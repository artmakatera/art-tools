import { useCallback, useMemo } from "react";
import {
  useGanttConfig,
  useGanttScroll,
  useGanttTask,
} from "../../context/GanttContext";
import type { ColumnDef, GanttTask, Id } from "../../types";
import { TaskListHeader, DEFAULT_COLUMNS } from "./TaskListHeader";
import { TaskListRow } from "./TaskListRow";
import { addDays, getMinMaxDates } from "../../core/dateUtils";
import { computeTaskPixels, getFinestUnit } from "../../core/barUtils";
import { scrollOffsetToReveal } from "../../core/scroll";
import styles from "./TaskList.module.css";

interface TaskListProps {
  columns?: ColumnDef[];
}

export function TaskList({ columns = [] }: TaskListProps) {
  const {
    visibleTasks,
    tasksList,
    expandedIds,
    parentIds,
    toggleExpand,
    selectedId,
    setSelectedId,
    onTaskClick,
  } = useGanttTask();
  const { rowHeight, colWidth, scales, padDays, height } = useGanttConfig();
  const { taskListRef, onTaskListScroll, gridRef } = useGanttScroll();

  const allColumns = useMemo(
    () => (columns.length > 0 ? columns : DEFAULT_COLUMNS),
    [columns],
  );

  const scrollToTask = useCallback(
    (task: GanttTask) => {
      const grid = gridRef.current;
      const range = getMinMaxDates(visibleTasks);
      if (!grid || !range) {
        return;
      }
      // Matches the grid's origin: buildDatesFromTasks starts at min - padDays.
      const origin = addDays(range.min, -padDays);
      const { left, width } = computeTaskPixels(task, {}, origin, colWidth, {
        snapToDay: getFinestUnit(scales) !== "day",
      });
      const nextLeft = scrollOffsetToReveal(
        left,
        width,
        grid.scrollLeft,
        grid.clientWidth,
        colWidth, // keep one column of padding
      );
      if (nextLeft !== grid.scrollLeft) {
        grid.scrollLeft = nextLeft;
      }
    },
    [gridRef, visibleTasks, padDays, colWidth, scales],
  );

  // Selecting a row drives both the built-in highlight and the consumer's
  // onTaskClick, so external selection state (e.g. a "Delete selected" toolbar) stays in sync.
  const handleSelect = useCallback(
    (id: Id) => {
      setSelectedId(id);

      const task = visibleTasks.find((t) => t.id === id);
      if (task) {
        onTaskClick?.(task);
        scrollToTask(task);
      }
    },
    [setSelectedId, visibleTasks, onTaskClick, scrollToTask],
  );

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
  const bodyStyle =
    height !== undefined
      ? { flex: "1 1 auto", minHeight: 0 }
      : { height: bodyHeight };

  return (
    <div
      className={styles.taskList}
      style={height !== undefined ? { height } : undefined}
    >
      <TaskListHeader
        columns={allColumns}
        rowHeight={rowHeight}
        scales={scales}
      />
      <div
        ref={taskListRef}
        className={styles.body}
        style={bodyStyle}
        onScroll={onTaskListScroll}
      >
        <div
          className={styles.rows}
          style={{ height: visibleTasks.length * rowHeight }}
        >
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
