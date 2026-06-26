import { useCallback, useMemo } from "react";
import {
  useGanttConfig,
  useGanttScroll,
  useGanttTask,
} from "../../context/GanttContext";
import type { ColumnDef, GanttTask, Id } from "../../types";
import { TaskListHeader } from "./TaskListHeader";
import { TaskListRow } from "./TaskListRow";
import { addDays, getMinMaxDates } from "../../core/dateUtils";
import { computeTaskPixels, getFinestUnit } from "../../core/barUtils";
import { scrollOffsetToReveal } from "../../core/scroll";
import { rangeFromOffset } from "../../core/virtualize";
import { ROW_OVERSCAN } from "../../core/constants";
import { useColumnWidths } from "../../hooks/useColumnWidths";
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
  const {
    taskListRef,
    onTaskListScroll,
    gridRef,
    viewport,
    scrollToTask: scrollRowIntoView,
  } = useGanttScroll();

  const { widths, onResizeStart } = useColumnWidths();

  // Overlay the session-local resize widths onto the incoming columns. Both the
  // header and rows render this same array, so they stay aligned by construction.
  const resolvedColumns = useMemo(
    () =>
      columns.map((col) =>
        widths[col.key] != null ? { ...col, width: widths[col.key] } : col,
      ),
    [columns, widths],
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
        scrollToTask(task); // existing horizontal grid reveal — unchanged
        scrollRowIntoView(id); // new vertical list reveal (+ auto-expand)
      }
    },
    [setSelectedId, visibleTasks, onTaskClick, scrollToTask, scrollRowIntoView],
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

  // Render only the rows intersecting the viewport (plus overscan). Reuses the
  // grid's viewport: scrollTop is synced between the panes, and its clientHeight
  // is slightly larger (it spans the calendar header) so we over-render a few
  // rows at the bottom — never under-render. The `.rows` height stays full so the
  // scrollbar extent is unaffected.
  const rowRange = rangeFromOffset(
    viewport.scrollTop,
    viewport.clientHeight,
    rowHeight,
    visibleTasks.length,
    ROW_OVERSCAN,
  );

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
        columns={resolvedColumns}
        rowHeight={rowHeight}
        scales={scales}
        onResizeStart={onResizeStart}
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
          {visibleTasks.slice(rowRange.start, rowRange.end).map((task, i) => {
            const index = rowRange.start + i;
            return (
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
                columns={resolvedColumns}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
