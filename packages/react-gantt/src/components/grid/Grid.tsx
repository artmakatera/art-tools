import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps, ElementType } from "react";
import { buildDatesFromTasks } from "../../core/dateUtils";
import { resolveColumnStep, resolveColumnUnit } from "../../core/scales";
import type { GanttFocusSlot, GanttTask, Id, TaskState } from "../../types";
import type { ConnectorHandle } from "../../hooks/useDependencyDrag";
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
import { isEditableTarget } from "../../core/keys";
import { useRovingFocus } from "../../hooks/useRovingFocus";
import { useTreeGridKeyboard } from "../../hooks/useTreeGridKeyboard";
import { useGridEditKeyboard } from "../../hooks/useGridEditKeyboard";
import { useGridLinkKeyboard } from "../../hooks/useGridLinkKeyboard";
import {
  useGanttConfig,
  useGanttDependency,
  useGanttFocus,
  useGanttScroll,
  useGanttSelectedId,
  useGanttTaskActions,
  useGanttTaskState,
  useGanttViewport,
  useGanttZoom,
} from "../../context/GanttContext";

/** The two focus slots that name a connector handle, mapped to its edge. */
function handleSlotToConnector(slot: GanttFocusSlot): ConnectorHandle | null {
  if (slot === "startHandle") {
    return "start";
  }
  if (slot === "endHandle") {
    return "end";
  }
  return null;
}

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

export function GanttGrid({
  slots: slotsProp,
  slotProps: slotPropsProp,
}: GanttGridProps = {}) {
  const ganttSlots = useGanttSlots();
  const slots = slotsProp ?? ganttSlots.timeline?.grid?.slots;
  const slotProps = slotPropsProp ?? ganttSlots.timeline?.grid?.slotProps;

  const { visibleTasks, parentIds, expandedIds, treeMeta } = useGanttTaskState();
  const selectedId = useGanttSelectedId();
  const { focus, linkTarget } = useGanttFocus();
  const { updateTask, onTaskClick, setSelectedId, toggleExpand } = useGanttTaskActions();
  // The treegrid role sits on the slot-overridable Root, but focus and key
  // handling live on this inner, non-slot div — a consumer passing
  // slotProps.root.onKeyDown must not be able to delete the keyboard model.
  const gridInnerRef = useRef<HTMLDivElement>(null);
  const { colWidth, rowHeight, scales, padDays, height } = useGanttConfig();
  const { gridRef, onGridScroll, gridBodyRef } = useGanttScroll();
  const viewport = useGanttViewport();
  const { dependencies, onDependencyDelete } = useGanttDependency();
  const { zoomAt, zoomIn, zoomOut, wheelEnabled, keyboardEnabled, editingEnabled } =
    useGanttZoom();

  // Wheel zoom stays an imperative listener because it must be registered
  // non-passive so Ctrl/Cmd+wheel can preventDefault the browser's page zoom —
  // something React's onWheel prop cannot express. Keyboard zoom moved into the
  // pane's keydown handler below: it no longer needs its own tab stop now that
  // the roving cursor makes a bar focusable, and the old `grid.tabIndex = 0`
  // was an imperative write React didn't know about (and never reset).
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !wheelEnabled) {
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
    grid.addEventListener("wheel", onWheel, { passive: false });
    return () => grid.removeEventListener("wheel", onWheel);
  }, [gridRef, wheelEnabled, zoomAt]);

  const [overrides, setOverrides] = useState<Record<Id, Partial<TaskState>>>({});

  const handleSelect = useCallback((task: GanttTask) => {
    setSelectedId(task.id);
    onTaskClick?.(task);
  }, [setSelectedId, onTaskClick]);

  const handleOverride = useCallback((id: Id, patch: Partial<TaskState> | null) => {
    setOverrides((prev) => {
      if (patch === null) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: { ...prev[id], ...patch } };
    });
  }, []);

  // Pure functions of `scales`, resolved up here because the hooks below need
  // them and there is an early return further down.
  const unit = resolveColumnUnit(scales);
  const columnStep = resolveColumnStep(scales);

  const dates = useMemo(
    () => buildDatesFromTasks(visibleTasks, padDays, scales),
    [visibleTasks, padDays, scales],
  );

  // `dates` rebuilds on every task change, so `dates[0]` is a fresh Date each
  // time. Key a stable Date off its timestamp so the `origin` prop only changes
  // identity when the earliest day actually moves — otherwise memoized Bars
  // would all re-render on any unrelated update.
  const originMs = dates[0]?.getTime();
  const origin = useMemo(
    () => (originMs == null ? undefined : new Date(originMs)),
    [originMs],
  );

  const roving = useRovingFocus({
    pane: "grid",
    containerRef: gridInnerRef,
    scrollerRef: gridRef,
    visibleTasks,
    treeMeta,
    rowHeight,
    defaultSlot: "bar",
  });

  const treeKeys = useTreeGridKeyboard({
    roving,
    visibleTasks,
    parentIds,
    expandedIds,
    treeMeta,
    toggleExpand,
    onActivate: handleSelect,
  });

  const editKeys = useGridEditKeyboard({
    enabled: editingEnabled,
    roving,
    visibleTasks,
    parentIds,
    unit,
    step: columnStep,
    updateTask,
  });

  const linkKeys = useGridLinkKeyboard({
    enabled: editingEnabled,
    roving,
    visibleTasks,
    overrides,
    origin,
    colWidth,
    rowHeight,
    unit,
    snapToDay: true,
  });

  // Precedence: zoom, then editing, then the shared treegrid navigation.
  // Editing must outrank navigation because both claim Left/Right — with
  // `keyboardEditing` off they stay expand/collapse, which is the treegrid
  // default; with it on they nudge, which is what the timeline's single column
  // makes possible in the first place.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (keyboardEnabled && !isEditableTarget(e.target)) {
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          zoomIn();
          return;
        }
        if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          zoomOut();
          return;
        }
      }
      // Linking comes first: while a link is half-built it owns every key, so
      // an arrow can't nudge a bar out from under the rubber band.
      if (linkKeys(e)) {
        return;
      }
      if (editKeys(e)) {
        return;
      }
      treeKeys(e);
    },
    [keyboardEnabled, zoomIn, zoomOut, linkKeys, editKeys, treeKeys],
  );

  // Every hook above must run unconditionally, so this bail-out lives here.
  if (!origin) return null;

  const snapToDay = true; // TODO: make this configurable per Gantt instance
  const totalWidth = dates.length * colWidth;
  const bodyHeight = visibleTasks.length * rowHeight;

  // Virtualization windows: render only the rows/columns intersecting the
  // viewport (plus overscan). Container sizes above stay full so scrollbars
  // and scroll-into-view are unaffected.
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

  // Exactly one bar per pane is tabbable; when the cursor is elsewhere that is
  // the first bar of the current window, so tabbing in lands on something
  // visible rather than jumping the viewport to row 0.
  const rovingIndex = roving.focusedIndex >= 0 ? roving.focusedIndex : rowRange.start;

  // Rows to render: the window, plus the cursor's row when it has scrolled out
  // of it. Pinning keeps the focused element mounted so a wheel scroll can never
  // drop focus to <body>. Bars are absolutely positioned, so an out-of-window
  // index needs no special layout — but it must still be inserted in sorted
  // order, so React updates the existing node in place instead of remounting it
  // (a remount destroys the focused element, which is what pinning prevents).
  const pinnedIndex =
    roving.focusedIndex >= 0 &&
    (roving.focusedIndex < rowRange.start || roving.focusedIndex >= rowRange.end)
      ? roving.focusedIndex
      : -1;
  const barIndices: number[] = [];
  if (pinnedIndex >= 0 && pinnedIndex < rowRange.start) {
    barIndices.push(pinnedIndex);
  }
  for (let i = rowRange.start; i < rowRange.end; i += 1) {
    barIndices.push(i);
  }
  if (pinnedIndex >= rowRange.end) {
    barIndices.push(pinnedIndex);
  }

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
      // The timeline mirrors the task list's treegrid rather than being a bare
      // region, so bars and their connector handles have row context. It has no
      // header row (the calendar is decorative), so rowindex is 1-based on data.
      role: "treegrid",
      "aria-label": "Timeline",
      "aria-rowcount": visibleTasks.length,
      "aria-colcount": 1,
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
      <div
        ref={gridInnerRef}
        className={styles.grid}
        style={{ width: totalWidth }}
        role="presentation"
        onKeyDown={onKeyDown}
        {...roving.containerProps}
      >
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
          snapToDay={snapToDay}
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
            />
            <DependencyLinks
              width={totalWidth}
              height={bodyHeight}
              onDependencyDelete={onDependencyDelete}
              visibleRect={visibleRect}
            />
            <DependencyPreview />

            {barIndices.map((index) => {
              const task = visibleTasks[index]!;
              const meta = treeMeta.get(task.id);
              return (
                <Bar
                  key={task.id}
                  task={task}
                  index={index}
                  origin={origin}
                  colWidth={colWidth}
                  rowHeight={rowHeight}
                  snapToDay={snapToDay}
                  unit={unit}
                  depth={meta?.depth ?? 0}
                  posinset={meta?.posinset ?? 1}
                  setsize={meta?.setsize ?? 1}
                  isParent={parentIds.has(task.id)}
                  isExpanded={expandedIds.has(task.id)}
                  isSelected={selectedId === task.id}
                  isFocused={index === rovingIndex}
                  focusedHandle={
                    focus?.pane === "grid" && focus.taskId === task.id
                      ? handleSlotToConnector(focus.slot)
                      : null
                  }
                  linkTargetHandle={
                    linkTarget?.taskId === task.id ? linkTarget.handle : null
                  }
                  onUpdate={updateTask}
                  override={overrides[task.id]}
                  onOverride={handleOverride}
                  onTaskClick={handleSelect}
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

