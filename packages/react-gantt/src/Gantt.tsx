import { useRef } from "react";
import { GanttProvider } from "./context/GanttContext";
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
}: GanttProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const { gridWidth, onHandleMouseDown } = useGridResize(containerRef, overlayRef);
  const showTaskList = columns !== undefined;

  return (
    <GanttProvider
      tasks={tasks}
      dependencies={dependencies}
      rowHeight={rowHeight}
      colWidth={colWidth}
      height={height}
      scales={scales}
      padDays={padDays}
      onTaskClick={onTaskClick}
      onDependencyCreate={onDependencyCreate}
      onDependencyDelete={onDependencyDelete}
      onTaskCreate={onTaskCreate}
      onTaskDelete={onTaskDelete}
      onTaskEdit={onTaskEdit}
      onTasksChange={onTasksChange}
      apiRef={apiRef}
    >
      {showTaskList ? (
        <div ref={containerRef} style={{ position: "relative" }}>
            <TaskList columns={columns} />
          {/* <div
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
          </div> */}
        </div>
      ) : (
        <GanttGrid />
      )}
    </GanttProvider>
  );
}
