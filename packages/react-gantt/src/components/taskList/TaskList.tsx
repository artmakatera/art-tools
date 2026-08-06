import { useCallback, useMemo, useRef } from "react";
import {
  useGanttConfig,
  useGanttScroll,
  useGanttSelectedId,
  useGanttTaskActions,
  useGanttTaskState,
} from "../../context/GanttContext";
import { useRovingFocus } from "../../hooks/useRovingFocus";
import { useTreeGridKeyboard } from "../../hooks/useTreeGridKeyboard";
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
import { useViewportMeasure } from "../../hooks/useViewportMeasure";
import styles from "./TaskList.module.css";

interface TaskListProps {
  columns?: ColumnDef[];
  /** Slot overrides for the task-list pane (`treeCell`, `header`). Pass a stable object. */
  taskList?: GanttTaskListSlots;
}

export function TaskList({ columns = [], taskList }: TaskListProps) {
  const { visibleTasks, expandedIds, parentIds, treeMeta } =
    useGanttTaskState();
  const { toggleExpand, setSelectedId, onTaskClick } = useGanttTaskActions();
  const selectedId = useGanttSelectedId();
  const { rowHeight, colWidth, scales, padDays, height } = useGanttConfig();
  const { taskListRef, onTaskListScroll, gridRef } = useGanttScroll();
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Scroll the *grid* horizontally so the task's bar is on screen. Named for
  // what it does: the vertical reveal is `scrollToTask` on the scroll context.
  const revealHorizontally = useCallback(
    (task: GanttTask) => {
      const grid = gridRef.current;
      const range = getMinMaxDates(visibleTasks);
      if (!grid || !range) {
        return;
      }
      // Matches the grid's origin: buildDatesFromTasks aligns to the unit
      // boundary containing min, padded outward by whole columns.
      const unit = resolveColumnUnit(scales);
      const origin = resolveOrigin(range.min, unit, padDays, resolveColumnStep(scales));
      const { left, width } = computeTaskPixels(task, {}, origin, colWidth, unit, {
        snapToDay: true, // TODO: make this configurable per Gantt instance
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

  // Selection follows the cursor: moving focus highlights the row and reveals
  // its bar, but does NOT fire onTaskClick — that is activation, and arrowing
  // past twenty rows must not look like twenty clicks to the consumer.
  const focusRow = useCallback(
    (task: GanttTask) => {
      setSelectedId(task.id);
      revealHorizontally(task);
    },
    [setSelectedId, revealHorizontally],
  );

  const activateRow = useCallback(
    (task: GanttTask) => {
      onTaskClick?.(task);
    },
    [onTaskClick],
  );

  // The click path keeps doing both, so existing behaviour is unchanged.
  const handleSelect = useCallback(
    (id: Id) => {
      setSelectedId(id);

      const task = visibleTasks.find((t) => t.id === id);
      if (task) {
        onTaskClick?.(task);
        revealHorizontally(task); // existing horizontal grid reveal — unchanged
      }
    },
    [setSelectedId, visibleTasks, onTaskClick, revealHorizontally],
  );

  // Measure this pane's own scroll viewport for row windowing. We can't reuse
  // the grid's viewport: the grid may not be mounted (e.g. task-list-only mode),
  // in which case its metrics never get measured and we'd render every row. The
  // list body's scrollTop stays in sync with the grid when both are present, so
  // self-measuring is correct either way. Horizontal tracking is off: the list
  // body has `width: max-content`, so column/splitter resizes churn its width
  // without affecting which rows are visible.
  const { viewport: listViewport, scheduleMeasure } = useViewportMeasure(
    taskListRef,
    {
      trackHorizontal: false,
    },
  );

  // Re-measure on scroll (after syncing the grid), then window the rows.
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

  const roving = useRovingFocus({
    pane: "list",
    containerRef,
    scrollerRef: taskListRef,
    visibleTasks,
    treeMeta,
    rowHeight,
    defaultSlot: "row",
    onFocusMove: focusRow,
  });

  const onKeyDown = useTreeGridKeyboard({
    roving,
    visibleTasks,
    parentIds,
    expandedIds,
    treeMeta,
    toggleExpand,
    onActivate: activateRow,
  });

  // Exactly one row per pane is tabbable. When the cursor is elsewhere (or unset)
  // that is the first row of the current window, so tabbing in always lands on
  // something visible rather than scrolling the pane to row 0.
  const rovingIndex = roving.focusedIndex >= 0 ? roving.focusedIndex : rowRange.start;

  // Keep the cursor's row mounted even when scrolled out of the window, so its
  // DOM node — and therefore focus — survives a wheel scroll.
  //
  // It has to stay in the SAME children array, in sorted order. Moving a row
  // into a separate JSX slot makes React unmount and remount it, which destroys
  // the focused node and drops focus to <body> — the exact failure pinning
  // exists to prevent. Sorted, an out-of-window cursor is either below the
  // window (first) or above it (last), which is also its natural position, so
  // the element never even changes index.
  const pinnedIndex =
    roving.focusedIndex >= 0 &&
    (roving.focusedIndex < rowRange.start || roving.focusedIndex >= rowRange.end)
      ? roving.focusedIndex
      : -1;

  const rowIndices: number[] = [];
  if (pinnedIndex >= 0 && pinnedIndex < rowRange.start) {
    rowIndices.push(pinnedIndex);
  }
  for (let i = rowRange.start; i < rowRange.end; i += 1) {
    rowIndices.push(i);
  }
  if (pinnedIndex >= rowRange.end) {
    rowIndices.push(pinnedIndex);
  }

  const bodyStyle = { flex: "1 1 auto", minHeight: 0 };

  return (
    // The treegrid lives on this outer div rather than the scroller: it is not a
    // slot, so consumer slotProps can never displace the role (or, later, the
    // keydown handler), and it contains both the header row and the rowgroup.
    // aria-rowcount/-rowindex are mandatory here — rows are virtualized, so DOM
    // position tells assistive tech nothing about the real list size.
    <div
      ref={containerRef}
      className={styles.taskList}
      style={{ height }}
      role="treegrid"
      aria-label="Tasks"
      aria-rowcount={visibleTasks.length + 1}
      aria-colcount={resolvedColumns.length}
      onKeyDown={onKeyDown}
      {...roving.containerProps}
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
        style={bodyStyle}
        onScroll={handleScroll}
        role="rowgroup"
      >
        <div className={styles.rows} role="presentation">
          {/* Spacer for the rows above the viewport, so the visible rows sit at
              the right scroll offset without absolute positioning. */}
          <div style={{ height: rowRange.start * rowHeight }} role="presentation" />
          {rowIndices.map((index) => {
            const task = visibleTasks[index]!;
            const meta = treeMeta.get(task.id);
            return (
              <TaskListRow
                key={task.id}
                task={task}
                rowHeight={rowHeight}
                // +2: aria-rowindex is 1-based and the header occupies row 1.
                rowIndex={index + 2}
                depth={meta?.depth ?? 0}
                posinset={meta?.posinset ?? 1}
                setsize={meta?.setsize ?? 1}
                isParent={parentIds.has(task.id)}
                isExpanded={expandedIds.has(task.id)}
                isSelected={selectedId === task.id}
                isFocused={index === rovingIndex}
                // Out-of-window rows leave the flow so the spacers, which size
                // themselves from the window alone, stay correct.
                offsetTop={index === pinnedIndex ? index * rowHeight : undefined}
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
          />
        </div>
      </div>
    </div>
  );
}
