import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentProps, ElementType } from "react";
import { buildTimelineDates } from "../../core/timeline";
import { DEFAULT_SCALES, resolveColumnStep, resolveColumnUnit } from "../../core/scales";
import type { GanttTask, Id, Overrides, TaskState } from "../../types";
import { mergeSlotProps, type SlotConfig, type SlotPropsInput } from "../../core/slots";
import { useGanttSlots } from "../../context/GanttSlotsContext";
import { Calendar } from "../calendar/Calendar";
import { Bar } from "../bars/common/Bar";
import { DependencyLinksProvider } from "../dependency-links/DependencyLinksContext";
import { DependencyLinks } from "../dependency-links/DependencyLinks";
import { DependencyPreview } from "../dependency-links/DependencyPreview";
import { GridColumns } from "./GridColumns";
import styles from "./Grid.module.css";
import { rangeFromOffset } from "../../core/virtualize";
import { COL_OVERSCAN, ROW_OVERSCAN } from "../../core/constants";
import {
  useGanttConfig,
  useGanttDependency,
  useGanttLabels,
  useGanttScroll,
  useGanttTaskActions,
  useGanttTaskState,
  useGanttViewport,
  useGanttZoom,
} from "../../context/contexts";

/** State passed to the function form of the Grid slotProps. */
export interface GridOwnerState {
  /** Total content width in px (`dates.length * colWidth`). */
  totalWidth: number;
  /** Total body height in px (`visibleTasks.length * rowHeight`). */
  bodyHeight: number;
  /** Fixed grid-wrapper height when configured, else `undefined` (auto). */
  height: number | undefined;
}

export interface GridSlots {
  /** The scroll wrapper (`styles.gridWrapper`). Default: `"div"`. */
  root?: ElementType;
  /** The scrollable body layer (`styles.body`). Default: `"div"`. */
  body?: ElementType;
}

export interface GridSlotProps {
  root?: SlotPropsInput<ComponentProps<"div">, GridOwnerState>;
  body?: SlotPropsInput<ComponentProps<"div">, GridOwnerState>;
}

/**
 * Slot config for the Gantt grid. Threaded from `<Gantt>` in a later pass.
 *
 * NOTE: pass a referentially stable / memoized object so downstream memoization
 * is not defeated by a fresh object each render.
 */
export type GridSlotConfig = SlotConfig<GridSlots, GridSlotProps>;

interface GanttGridProps {
  slots?: GridSlots;
  slotProps?: GridSlotProps;
}

export function GanttGrid({ slots: slotsProp, slotProps: slotPropsProp }: GanttGridProps = {}) {
  const ganttSlots = useGanttSlots();
  const slots = slotsProp ?? ganttSlots.timeline?.grid?.slots;
  const slotProps = slotPropsProp ?? ganttSlots.timeline?.grid?.slotProps;

  const { visibleTasks } = useGanttTaskState();
  const { updateTask, commitTask, onTaskClick, setSelectedId } = useGanttTaskActions();
  const { colWidth, rowHeight, scales, padDays, height } = useGanttConfig();
  const labels = useGanttLabels();
  const { gridRef, onGridScroll, gridBodyRef } = useGanttScroll();
  const viewport = useGanttViewport();
  const { dependencies, onDependencyDelete } = useGanttDependency();
  const { zoomAt, zoomIn, zoomOut, wheelEnabled, keyboardEnabled } = useGanttZoom();

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || (!wheelEnabled && !keyboardEnabled)) {
      return;
    }
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) {
        return;
      }
      e.preventDefault();
      const rect = grid.getBoundingClientRect();
      const focusPx = grid.scrollLeft + (e.clientX - rect.left);
      zoomAt(focusPx, e.deltaY < 0 ? 1 : -1);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomOut();
      }
    };
    if (wheelEnabled) {
      grid.addEventListener("wheel", onWheel, { passive: false });
    }
    if (keyboardEnabled) {
      grid.tabIndex = 0;
      grid.addEventListener("keydown", onKeyDown);
    }
    return () => {
      grid.removeEventListener("wheel", onWheel);
      grid.removeEventListener("keydown", onKeyDown);
    };
  }, [gridRef, wheelEnabled, keyboardEnabled, zoomAt, zoomIn, zoomOut, visibleTasks.length]);

  const [overrides, setOverrides] = useState<Overrides>({});

  const handleSelect = useCallback(
    (task: GanttTask) => {
      setSelectedId(task.id);
      onTaskClick?.(task);
    },
    [setSelectedId, onTaskClick],
  );

  const handleOverride = useCallback((id: Id, patch: Partial<TaskState> | null) => {
    setOverrides((prev) => {
      if (patch === null) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: { ...prev[id], ...patch } };
    });
  }, []);

  const dates = useMemo(
    () => buildTimelineDates(visibleTasks, padDays, scales),
    [visibleTasks, padDays, scales],
  );

  const originMs = dates[0]?.getTime();
  const origin = useMemo(() => (originMs == null ? undefined : new Date(originMs)), [originMs]);
  if (!origin) {
    return null;
  }

  const unit = resolveColumnUnit(scales);
  const totalWidth = dates.length * colWidth;
  const bodyHeight = visibleTasks.length * rowHeight;

  const resolvedScales = scales ?? DEFAULT_SCALES;
  const headerRowCount = resolvedScales.length;

  const rowRange = rangeFromOffset(
    viewport.scrollTop,
    viewport.clientHeight,
    rowHeight,
    visibleTasks.length,
    ROW_OVERSCAN,
  );
  const colRange = rangeFromOffset(
    viewport.scrollLeft,
    viewport.clientWidth,
    colWidth,
    dates.length,
    COL_OVERSCAN,
  );

  // Overscan-padded visible pixel rect, reused to cull dependency links. The
  // ranges already include overscan and are clamped to the content bounds.
  const visibleRect = {
    minX: colRange.start * colWidth,
    maxX: colRange.end * colWidth,
    minY: rowRange.start * rowHeight,
    maxY: rowRange.end * rowHeight,
  };

  const Root = slots?.root ?? "div";
  const Body = slots?.body ?? "div";

  const ownerState: GridOwnerState = { totalWidth, bodyHeight, height };

  const rootProps = mergeSlotProps(
    {
      className: styles.gridWrapper,
      style: height !== undefined ? { height } : {},
      onScroll: onGridScroll,
      role: "grid",
      "aria-label": labels.timeline,
      "aria-rowcount": headerRowCount + visibleTasks.length,
      "aria-colcount": dates.length,
    },
    slotProps?.root,
    ownerState,
  );

  const bodyProps = mergeSlotProps(
    {
      className: styles.body,
      style: { height: bodyHeight, width: totalWidth },
      role: "rowgroup",
    },
    slotProps?.body,
    ownerState,
  );

  return (
    <Root ref={gridRef} {...rootProps}>
      <div className={styles.grid} style={{ width: totalWidth }} role="presentation">
        <Calendar
          colWidth={colWidth}
          rowHeight={rowHeight}
          dates={dates}
          scales={scales}
          colRange={colRange}
        />
        <DependencyLinksProvider
          tasks={visibleTasks}
          dependencies={dependencies}
          origin={origin}
          colWidth={colWidth}
          rowHeight={rowHeight}
          unit={unit}
          overrides={overrides}
        >
          <Body ref={gridBodyRef} {...bodyProps}>
            <GridColumns
              dates={dates}
              colWidth={colWidth}
              bodyHeight={bodyHeight}
              colRange={colRange}
              unit={unit}
              step={resolveColumnStep(scales)}
            />
            <DependencyLinks
              width={totalWidth}
              height={bodyHeight}
              onDependencyDelete={onDependencyDelete}
              visibleRect={visibleRect}
            />
            <DependencyPreview />

            {visibleTasks.slice(rowRange.start, rowRange.end).map((task, i) => {
              const index = rowRange.start + i;
              return (
                <Bar
                  key={task.id}
                  task={task}
                  index={index}
                  origin={origin}
                  colWidth={colWidth}
                  rowHeight={rowHeight}
                  unit={unit}
                  onUpdate={updateTask}
                  onCommit={commitTask}
                  override={overrides[task.id]}
                  onOverride={handleOverride}
                  onTaskClick={handleSelect}
                  rowIndexOffset={headerRowCount}
                />
              );
            })}
          </Body>
        </DependencyLinksProvider>
      </div>
    </Root>
  );
}

GanttGrid.displayName = "GanttGrid";
