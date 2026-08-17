import { useMemo, useRef } from "react";
import { GanttProvider } from "./context/GanttContext";
import { GanttSlotsProvider } from "./context/GanttSlotsContext";
import { GanttGrid } from "./components/grid/Grid";
import { GridResizeHandle } from "./components/grid/GridResizeHandle";
import { TaskList } from "./components/taskList/TaskList";
import { useGridResize } from "./hooks/useGridResize";
import type { GanttProps } from "./types";
import { DEFAULT_COLUMNS, READ_ONLY_COLUMNS } from "./components/taskList/TaskListHeader";
import { DEFAULT_LABELS } from "./core/labels";

export function Gantt({
  tasks,
  dependencies,
  rowHeight,
  colWidth,
  height,
  scales,
  padDays,
  zoomLevels,
  defaultZoomIndex,
  onZoomChange,
  zoomWheel,
  zoomKeyboard,
  onTaskClick,
  columns: columnsProp,
  defaultTaskListWidth = 280,
  onDependencyCreate,
  onDependencyDelete,
  onTaskCreate,
  onTaskDelete,
  onTaskEdit,
  onTasksChange,
  calendar,
  snapToWorking,
  durationUnit,
  readOnly = false,
  apiRef,
  hideTaskList,
  taskList,
  bars,
  dependencySlots,
  timeline,
  labels
}: GanttProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const { gridWidth, onHandleMouseDown } = useGridResize(containerRef, overlayRef);
  // The built-in actions column only renders edit/add/delete buttons, so a
  // read-only chart drops it rather than shipping a column of dead controls.
  const columns = columnsProp ?? (readOnly ? READ_ONLY_COLUMNS : DEFAULT_COLUMNS);
  const showTaskList = !hideTaskList;

  // Grid-side slot groups reach deep components (bars, dependencies, calendar,
  // grid) via context instead of prop-drilling. `taskList` is drilled separately.
  const slotsValue = useMemo(
    () => ({ bars, dependencies: dependencySlots, timeline }),
    [bars, dependencySlots, timeline],
  );

  return (
    <GanttProvider
      tasks={tasks}
      dependencies={dependencies}
      rowHeight={rowHeight}
      colWidth={colWidth}
      height={height}
      scales={scales}
      padDays={padDays}
      zoomLevels={zoomLevels}
      defaultZoomIndex={defaultZoomIndex}
      onZoomChange={onZoomChange}
      zoomWheel={zoomWheel}
      zoomKeyboard={zoomKeyboard}
      onTaskClick={onTaskClick}
      onDependencyCreate={onDependencyCreate}
      onDependencyDelete={onDependencyDelete}
      onTaskCreate={onTaskCreate}
      onTaskDelete={onTaskDelete}
      onTaskEdit={onTaskEdit}
      onTasksChange={onTasksChange}
      apiRef={apiRef}
      labels={labels}
      calendar={calendar}
      snapToWorking={snapToWorking}
      durationUnit={durationUnit}
      readOnly={readOnly}
    >
      <GanttSlotsProvider value={slotsValue}>
      {showTaskList ? (
        <div
          ref={containerRef}
          role="group"
          aria-label={labels?.gantt ?? DEFAULT_LABELS.gantt}
          style={{ position: "relative" }}
        >
            <TaskList columns={columns} taskList={taskList} />
          <div
            ref={overlayRef}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              zIndex: 1,
              display: "flex",
              flexDirection: "row",
              background: "var(--am-gantt-grid-bg, #ffffff)",
              ...(gridWidth !== undefined
                ? { width: gridWidth }
                : { left: defaultTaskListWidth }),
            }}
          >
            <GridResizeHandle onMouseDown={onHandleMouseDown} />
            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
              <GanttGrid />
            </div>
          </div>
        </div>
      ) : (
        <GanttGrid />
      )}
      </GanttSlotsProvider>
    </GanttProvider>
  );
}
