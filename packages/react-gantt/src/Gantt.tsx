import { useMemo, useRef } from "react";
import { GanttProvider } from "./context/GanttContext";
import { GanttSlotsProvider } from "./context/GanttSlotsContext";
import { GanttGrid } from "./components/grid/Grid";
import { GridResizeHandle } from "./components/grid/GridResizeHandle";
import { TaskList } from "./components/taskList/TaskList";
import { useGridResize } from "./hooks/useGridResize";
import type { GanttProps } from "./types";
import { DEFAULT_COLUMNS } from "./components/taskList/TaskListHeader";

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
  keyboardEditing,
  onTaskClick,
  columns = DEFAULT_COLUMNS,
  defaultTaskListWidth = 280,
  onDependencyCreate,
  onDependencyDelete,
  onTaskCreate,
  onTaskDelete,
  onTaskEdit,
  onTasksChange,
  apiRef,
  hideTaskList,
  taskList,
  bars,
  dependencySlots,
  timeline
}: GanttProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const { gridWidth, onHandleMouseDown } = useGridResize(containerRef, overlayRef);
  const showTaskList = columns !== undefined && !hideTaskList;

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
      keyboardEditing={keyboardEditing}
      onTaskClick={onTaskClick}
      onDependencyCreate={onDependencyCreate}
      onDependencyDelete={onDependencyDelete}
      onTaskCreate={onTaskCreate}
      onTaskDelete={onTaskDelete}
      onTaskEdit={onTaskEdit}
      onTasksChange={onTasksChange}
      apiRef={apiRef}
    >
      <GanttSlotsProvider value={slotsValue}>
      {showTaskList ? (
        <div ref={containerRef} style={{ position: "relative" }}>
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
