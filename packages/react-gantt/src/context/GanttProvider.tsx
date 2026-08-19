import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { GanttProviderProps } from "../types";
import type { GanttTask, Id } from "../types";
import { useResolvedCalendar } from "../hooks/useResolvedCalendar";
import { type SchedulingContext } from "../core/taskDates";
import { resolveLabels } from "../core/labels";
import { useTaskList, EMPTY_DEPENDENCIES } from "../hooks/useTaskList";
import { useExpand } from "../hooks/useExpand";
import { useScrollSync } from "../hooks/useScrollSync";
import { useEventCallback } from "../hooks/useEventCallback";
import { useLatestRef } from "../hooks/useLatestRef";
import { useRevealTask } from "../hooks/useRevealTask";
import { useZoom } from "../hooks/useZoom";
import { DEFAULT_ZOOM_INDEX, resolveZoomLevels } from "../core/zoom";
import { useDependencyDrag } from "../hooks/useDependencyDrag";
import { DEFAULT_PAD_DAYS, DEFAULT_ROW_HEIGHT } from "../core/constants";
import { useGanttHandle } from "./useGanttHandle";
import { useColumnApi } from "./useColumnApi";
import {
  GanttCalendarContext,
  GanttConfigContext,
  GanttDependencyContext,
  GanttDragActiveContext,
  GanttDragContext,
  GanttLabelsContext,
  GanttReadOnlyContext,
  GanttScrollContext,
  GanttSelectionContext,
  GanttTaskActionsContext,
  GanttTaskStateContext,
  GanttViewportContext,
  GanttZoomContext,
  type GanttConfigValue,
  type GanttDependencyValue,
  type GanttScrollValue,
  type GanttTaskActionsValue,
  type GanttTaskStateValue,
  type GanttZoomValue,
} from "./contexts";

/**
 * The composition root: owns every piece of chart state and publishes it through
 * the twelve contexts defined in `contexts.ts`.
 *
 * The provider nesting at the bottom is ordered stable-outermost, hottest-inside,
 * mirroring the cadence table in `contexts.ts`. That order is not load-bearing
 * today — no layer derives its value from another, and React resolves `useContext`
 * to the nearest provider at any depth — but it documents the architecture, and it
 * *becomes* load-bearing the moment a layer starts reading another context. Keep
 * it.
 */
export function GanttProvider({
  tasks,
  rowHeight = DEFAULT_ROW_HEIGHT,
  colWidth,
  height,
  scales,
  padDays = DEFAULT_PAD_DAYS,
  zoomLevels,
  defaultZoomIndex,
  onZoomChange,
  zoomWheel = false,
  zoomKeyboard = false,
  dependencies = EMPTY_DEPENDENCIES,
  onTaskClick,
  onDependencyCreate,
  onDependencyDelete,
  onTaskCreate: onTaskCreateProp,
  onTaskDelete,
  onTaskEdit,
  onTasksChange,
  apiRef,
  labels,
  calendar,
  snapToWorking = true,
  durationUnit = "day",
  readOnly = false,
  children,
}: GanttProviderProps) {
  const [selectedId, setSelectedId] = useState<Id | null>(null);

  const labelsValue = useMemo(() => resolveLabels(labels), [labels]);

  // Content-keyed, so an inline `calendar={{...}}` prop does not churn identity.
  const resolvedCalendar = useResolvedCalendar(calendar);
  const schedulingContext = useMemo<SchedulingContext>(
    () => ({ calendar: resolvedCalendar, durationUnit, snapToWorking }),
    [resolvedCalendar, durationUnit, snapToWorking],
  );

  // Latest-refs for consumer callbacks used internally at a single call site,
  // so the handlers that wrap them keep a stable identity even when the
  // consumer passes inline functions.
  const onTaskEditRef = useLatestRef(onTaskEdit);

  // Callbacks handed to consumers through context: presence-preserving stable
  // wrappers, so context values only churn when the callback's presence flips.
  const onTaskClickStable = useEventCallback(onTaskClick);
  const onDependencyDeleteStable = useEventCallback(onDependencyDelete);

  const {
    tasksList,
    updateTask,
    commitTask,
    createTask: commitCreateTask,
    deleteTask,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useTaskList(
    tasks,
    dependencies,
    {
      onTaskCreate: onTaskCreateProp,
      onTaskDelete,
      onTasksChange,
    },
    schedulingContext,
  );

  const { visibleTasks, expandedIds, parentIds, toggleExpand, revealAncestors } =
    useExpand(tasksList);
  const { taskListRef, gridRef, onTaskListScroll, onGridScroll, viewport } = useScrollSync();
  const gridBodyRef = useRef<HTMLDivElement>(null);

  // Zoom owns the effective `scales`/`colWidth`: each ladder rung defines the
  // calendar rows and the column width. Standalone `scales`/`colWidth` props
  // seed the default rung (see resolveZoomLevels).
  const zoomLevelsResolved = useMemo(
    () => resolveZoomLevels(zoomLevels, scales, colWidth),
    [zoomLevels, scales, colWidth],
  );
  const zoom = useZoom({
    gridRef,
    visibleTasks,
    padDays,
    levels: zoomLevelsResolved,
    initialIndex: defaultZoomIndex ?? DEFAULT_ZOOM_INDEX,
  });

  // After zoom: the horizontal reveal measures against the effective colWidth and
  // scales of the current rung, not the raw props.
  const revealTask = useRevealTask({
    taskListRef,
    gridRef,
    tasksList,
    visibleTasks,
    rowHeight,
    colWidth: zoom.level.colWidth,
    scales: zoom.level.scales,
    padDays,
    revealAncestors,
  });

  // Fires on mount as well as on every change, so a consumer can render zoom
  // controls from it without duplicating the initial-index resolution.
  const onZoomChangeRef = useLatestRef(onZoomChange);
  useEffect(() => {
    onZoomChangeRef.current?.({ index: zoom.index, count: zoom.count });
  }, [zoom.index, zoom.count, onZoomChangeRef]);

  // Commit (flushSync inside, so the consumer's onTaskCreate fires first),
  // then select and reveal the new task. `revealTask` sees the fresh list:
  // flushSync re-rendered this provider before returning.
  const createTask = useCallback(
    (task: GanttTask, afterId?: Id | null) => {
      commitCreateTask(task, afterId);
      setSelectedId(task.id);
      revealTask(task.id);
    },
    [commitCreateTask, revealTask],
  );

  const { zoomIn, zoomOut, setZoom, zoomAt } = zoom;

  // One handle, two consumers. `apiRef` and `columnApi` used to build the same
  // nine members separately, behind two 9-entry dep arrays.
  const handle = useGanttHandle({
    createTask,
    updateTask,
    deleteTask,
    undo,
    redo,
    revealTask,
    zoomIn,
    zoomOut,
    setZoom,
  });
  useImperativeHandle(apiRef, () => handle, [handle]);

  const columnApi = useColumnApi({
    handle,
    readOnly,
    labels: labelsValue,
    schedulingContext,
    onTaskEditRef,
  });

  const { drag, startDrag, endDrag } = useDependencyDrag({ gridBodyRef, onDependencyCreate });

  // --- Context values ---
  const configValue = useMemo<GanttConfigValue>(
    () => ({
      rowHeight,
      colWidth: zoom.level.colWidth,
      scales: zoom.level.scales,
      padDays,
      height,
    }),
    [rowHeight, zoom.level, padDays, height],
  );

  const zoomValue = useMemo<GanttZoomValue>(
    () => ({
      zoomIn,
      zoomOut,
      zoomAt,
      wheelEnabled: zoomWheel,
      keyboardEnabled: zoomKeyboard,
    }),
    [zoomIn, zoomOut, zoomAt, zoomWheel, zoomKeyboard],
  );

  const taskStateValue = useMemo<GanttTaskStateValue>(
    () => ({ tasksList, visibleTasks, expandedIds, parentIds, canUndo, canRedo }),
    [tasksList, visibleTasks, expandedIds, parentIds, canUndo, canRedo],
  );

  // `setSelectedId` is a useState setter — stable, safe to omit from deps.
  const taskActionsValue = useMemo<GanttTaskActionsValue>(
    () => ({
      updateTask,
      commitTask,
      createTask,
      deleteTask,
      undo,
      redo,
      columnApi,
      setSelectedId,
      toggleExpand,
      onTaskClick: onTaskClickStable,
      revealTask,
    }),
    [
      updateTask,
      commitTask,
      createTask,
      deleteTask,
      undo,
      redo,
      columnApi,
      toggleExpand,
      onTaskClickStable,
      revealTask,
    ],
  );

  // All members are stable refs/callbacks → created exactly once.
  const scrollValue = useMemo<GanttScrollValue>(
    () => ({ taskListRef, gridRef, gridBodyRef, onTaskListScroll, onGridScroll }),
    [taskListRef, gridRef, onTaskListScroll, onGridScroll],
  );

  const dependencyValue = useMemo<GanttDependencyValue>(
    () => ({
      dependencies,
      onDependencyDelete: onDependencyDeleteStable,
      startDrag,
      endDrag,
    }),
    [dependencies, onDependencyDeleteStable, startDrag, endDrag],
  );

  // `viewport`, `selectedId`, `drag`, and `drag !== null` are passed directly:
  // primitives or already identity-stable when unchanged.
  return (
    <GanttConfigContext.Provider value={configValue}>
      <GanttReadOnlyContext.Provider value={readOnly}>
        <GanttLabelsContext.Provider value={labelsValue}>
          <GanttCalendarContext.Provider value={schedulingContext}>
            <GanttZoomContext.Provider value={zoomValue}>
              <GanttScrollContext.Provider value={scrollValue}>
                <GanttTaskActionsContext.Provider value={taskActionsValue}>
                  <GanttDependencyContext.Provider value={dependencyValue}>
                    <GanttTaskStateContext.Provider value={taskStateValue}>
                      <GanttSelectionContext.Provider value={selectedId}>
                        <GanttDragActiveContext.Provider value={drag !== null}>
                          <GanttViewportContext.Provider value={viewport}>
                            <GanttDragContext.Provider value={drag}>
                              {children}
                            </GanttDragContext.Provider>
                          </GanttViewportContext.Provider>
                        </GanttDragActiveContext.Provider>
                      </GanttSelectionContext.Provider>
                    </GanttTaskStateContext.Provider>
                  </GanttDependencyContext.Provider>
                </GanttTaskActionsContext.Provider>
              </GanttScrollContext.Provider>
            </GanttZoomContext.Provider>
          </GanttCalendarContext.Provider>
        </GanttLabelsContext.Provider>
      </GanttReadOnlyContext.Provider>
    </GanttConfigContext.Provider>
  );
}
