import { useCallback, useMemo } from "react";
import {
  useGanttConfig,
  useGanttLabels,
  useGanttScroll,
  useGanttSelectedId,
  useGanttTaskActions,
  useGanttTaskState,
} from "../../context/GanttContext";
import type { ColumnDef, GanttTask, Id } from "../../types";
import { TaskListHeader } from "./TaskListHeader";
import { TaskListRow } from "./TaskListRow";
import type { GanttTaskListSlots } from "../../context/GanttSlotsContext";
import { getMinMaxDates, resolveOrigin } from "../../core/dateUtils";
import { computeTaskPixels } from "../../core/barUtils";
import { resolveColumnStep, resolveColumnUnit } from "../../core/scales";
import { scrollOffsetToReveal } from "../../core/scroll";
import { rangeFromOffset } from "../../core/virtualize";
import { ROW_OVERSCAN } from "../../core/constants";
import { useColumnWidths } from "../../hooks/useColumnWidths";
import { useLatestRef } from "../../hooks/useLatestRef";
import { useViewportMeasure } from "../../hooks/useViewportMeasure";
import styles from "./TaskList.module.css";

/** Static, so it is hoisted out of the render path rather than re-allocated. */
const BODY_STYLE = { flex: "1 1 auto", minHeight: 0 } as const;

interface TaskListProps {
  columns?: ColumnDef[];
  /** Slot overrides for the task-list pane (`treeCell`, `header`). Pass a stable object. */
  taskList?: GanttTaskListSlots;
}

export function TaskList({ columns = [], taskList }: TaskListProps) {
  const { visibleTasks, expandedIds, parentIds } = useGanttTaskState();
  const { toggleExpand, setSelectedId, onTaskClick } = useGanttTaskActions();
  const selectedId = useGanttSelectedId();
  const { rowHeight, colWidth, scales, padDays, height } = useGanttConfig();
  const labels = useGanttLabels();
  const { taskListRef, onTaskListScroll, gridRef } = useGanttScroll();

  const { widths, onResizeStart } = useColumnWidths();

  // Overlay the session-local resize widths onto the incoming columns. Both the
  // header and rows render this same array, so they stay aligned by construction.
  const resolvedColumns = useMemo(
    () =>
      columns.map((col) => (widths[col.key] != null ? { ...col, width: widths[col.key] } : col)),
    [columns, widths],
  );

  const scrollToTask = (task: GanttTask) => {
    const grid = gridRef.current;
    const range = getMinMaxDates(visibleTasks);
    if (!grid || !range) {
      return;
    }
    // Matches the grid's origin: buildDatesFromTasks aligns to the unit
    // boundary containing min, padded outward by whole columns.
    const unit = resolveColumnUnit(scales);
    const origin = resolveOrigin(range.min, unit, padDays, resolveColumnStep(scales));
    const { left, width } = computeTaskPixels(task, {}, origin, colWidth, unit);
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
  };

  // Dispatched through a latest-ref so `handleSelect` is identity-stable
  // forever: it is handed to every memoized row, and closing over `visibleTasks`
  // directly would re-render the whole window on every edit, expand or zoom.
  // (Same pattern as `useScrollToTask`.)
  const selectRef = useLatestRef((id: Id) => {
    setSelectedId(id);

    const task = visibleTasks.find((t) => t.id === id);
    if (task) {
      onTaskClick?.(task);
      scrollToTask(task); // existing horizontal grid reveal — unchanged
    }
  });
  const handleSelect = useCallback((id: Id) => selectRef.current(id), [selectRef]);

  const depthMap = useMemo(() => {
    const map = new Map<Id, number>();
    for (const t of visibleTasks) {
      const parentDepth = t.parentId != null ? (map.get(t.parentId) ?? 0) : -1;
      map.set(t.id, parentDepth + 1);
    }
    return map;
  }, [visibleTasks]);

  const siblingInfo = useMemo(() => {
    const counts = new Map<Id | null, number>();
    const map = new Map<Id, { posinset: number; setsize: number }>();
    for (const t of visibleTasks) {
      const parent = t.parentId ?? null;
      const pos = (counts.get(parent) ?? 0) + 1;
      counts.set(parent, pos);
      map.set(t.id, { posinset: pos, setsize: 0 });
    }
    for (const t of visibleTasks) {
      const entry = map.get(t.id)!;
      entry.setsize = counts.get(t.parentId ?? null) ?? 1;
    }
    return map;
  }, [visibleTasks]);

  const { viewport: listViewport, scheduleMeasure } = useViewportMeasure(taskListRef, {
    trackHorizontal: false,
  });

  // Order matters: sync the grid first, then measure, so the windowing reads the
  // scroll position both panes have settled on.
  const handleScroll = useCallback(() => {
    onTaskListScroll();
    scheduleMeasure();
  }, [onTaskListScroll, scheduleMeasure]);

  // Render only the rows intersecting the viewport (plus overscan). The `.rows`
  // height stays full (via the spacers) so the scrollbar extent is unaffected.
  const rowRange = rangeFromOffset(
    listViewport.scrollTop,
    listViewport.clientHeight,
    rowHeight,
    visibleTasks.length,
    ROW_OVERSCAN,
  );

  return (
    <div
      className={styles.taskList}
      style={{ height }}
      role="treegrid"
      aria-label={labels.taskList}
      aria-rowcount={visibleTasks.length + 1}
      aria-colcount={resolvedColumns.length}
    >
      <TaskListHeader
        columns={resolvedColumns}
        rowHeight={rowHeight}
        scales={scales}
        onResizeStart={onResizeStart}
        slots={taskList?.header?.slots}
        slotProps={taskList?.header?.slotProps}
      />
      <div
        ref={taskListRef}
        className={styles.body}
        style={BODY_STYLE}
        onScroll={handleScroll}
        role="presentation"
      >
        <div className={styles.rows} role="rowgroup">
          <div
            style={{ height: rowRange.start * rowHeight }}
            role="presentation"
            aria-hidden="true"
          />
          {Array.from({ length: rowRange.end - rowRange.start }, (_, i) => {
            const index = rowRange.start + i;
            const task = visibleTasks[index]!;
            const siblings = siblingInfo.get(task.id);
            return (
              <TaskListRow
                key={task.id}
                task={task}
                rowHeight={rowHeight}
                rowIndex={index}
                depth={depthMap.get(task.id) ?? 0}
                posinset={siblings?.posinset ?? 1}
                setsize={siblings?.setsize ?? 1}
                isParent={parentIds.has(task.id)}
                isExpanded={expandedIds.has(task.id)}
                isSelected={selectedId === task.id}
                onToggleExpand={toggleExpand}
                onSelect={handleSelect}
                columns={resolvedColumns}
                treeCell={taskList?.treeCell}
              />
            );
          })}
          <div
            style={{
              height: (visibleTasks.length - rowRange.end) * rowHeight,
            }}
            role="presentation"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
