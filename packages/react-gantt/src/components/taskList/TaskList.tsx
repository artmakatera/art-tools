import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useGanttConfig,
  useGanttScroll,
  useGanttSelectedId,
  useGanttTaskActions,
  useGanttTaskState,
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
  const { visibleTasks, tasksList, expandedIds, parentIds } = useGanttTaskState();
  const { toggleExpand, setSelectedId, onTaskClick } = useGanttTaskActions();
  const selectedId = useGanttSelectedId();
  const { rowHeight, colWidth, scales, padDays, height } = useGanttConfig();
  const {
    taskListRef,
    onTaskListScroll,
    gridRef,
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

  // Measure this pane's own scroll viewport for row windowing. We can't reuse
  // the grid's viewport: the grid may not be mounted (e.g. task-list-only mode),
  // in which case its metrics never get measured and we'd render every row. The
  // list body's scrollTop stays in sync with the grid when both are present, so
  // self-measuring is correct either way. Coalesce bursts into one rAF update.
  const [listViewport, setListViewport] = useState({
    scrollTop: 0,
    clientHeight: 0,
  });
  const measureFrameRef = useRef<number | null>(null);

  const measureViewport = useCallback(() => {
    if (measureFrameRef.current !== null) {
      return;
    }
    measureFrameRef.current = requestAnimationFrame(() => {
      measureFrameRef.current = null;
      const el = taskListRef.current;
      if (!el) {
        return;
      }
      setListViewport((prev) =>
        prev.scrollTop === el.scrollTop && prev.clientHeight === el.clientHeight
          ? prev
          : { scrollTop: el.scrollTop, clientHeight: el.clientHeight },
      );
    });
  }, [taskListRef]);

  // Measure synchronously before first paint so the initial window is correct.
  useLayoutEffect(() => {
    const el = taskListRef.current;
    if (!el) {
      return;
    }
    setListViewport({ scrollTop: el.scrollTop, clientHeight: el.clientHeight });
  }, [taskListRef]);

  // Keep clientHeight in sync with container resizes.
  useEffect(() => {
    const el = taskListRef.current;
    if (!el || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(measureViewport);
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (measureFrameRef.current !== null) {
        cancelAnimationFrame(measureFrameRef.current);
        measureFrameRef.current = null;
      }
    };
  }, [taskListRef, measureViewport]);

  // Re-measure on scroll (after syncing the grid), then window the rows.
  const handleScroll = useCallback(() => {
    onTaskListScroll();
    measureViewport();
  }, [onTaskListScroll, measureViewport]);

  // Render only the rows intersecting the viewport (plus overscan). The `.rows`
  // height stays full (via the spacers) so the scrollbar extent is unaffected.
  const rowRange = rangeFromOffset(
    listViewport.scrollTop,
    listViewport.clientHeight,
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
        onScroll={handleScroll}
      >
        <div className={styles.rows}>
          {/* Spacer for the rows above the viewport, so the visible rows sit at
              the right scroll offset without absolute positioning. */}
          <div style={{ height: rowRange.start * rowHeight }} />
          {Array.from({ length: rowRange.end - rowRange.start }, (_, i) => {
            const index = rowRange.start + i;
            const task = visibleTasks[index]!;
            return (
              <TaskListRow
                key={task.id}
                task={task}
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
          {/* Spacer for the rows below the viewport, keeping the scroll extent
              equal to the full list height. */}
          <div
            style={{
              height: (visibleTasks.length - rowRange.end) * rowHeight,
            }}
          />
        </div>
      </div>
    </div>
  );
}
