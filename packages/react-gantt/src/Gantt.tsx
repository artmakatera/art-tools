import { useRef } from "react";
import { GanttProvider } from "./context/GanttContext";
import { GanttGrid } from "./components/grid/Grid";
import { GridResizeHandle } from "./components/grid/GridResizeHandle";
import { TaskList } from "./components/taskList/TaskList";
import { useGridResize } from "./hooks/useGridResize";
import type { GanttProps } from "./types";

export function Gantt({
  tasks,
  dependencies,
  rowHeight,
  colWidth,
  scales,
  padDays,
  onTaskClick,
  columns,
  defaultTaskListWidth = 280,
  onDependencyCreate,
  onDependencyDelete,
}: GanttProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const { gridWidth, onHandleMouseDown } = useGridResize(containerRef, overlayRef, defaultTaskListWidth);
  const showTaskList = columns !== undefined;

  return (
    <GanttProvider
      tasks={tasks}
      dependencies={dependencies}
      rowHeight={rowHeight}
      colWidth={colWidth}
      scales={scales}
      padDays={padDays}
      onTaskClick={onTaskClick}
      onDependencyCreate={onDependencyCreate}
      onDependencyDelete={onDependencyDelete}
    >
      {showTaskList ? (
        <div ref={containerRef} style={{ position: "relative" }}>
          <div style={{ width: defaultTaskListWidth }}>
            <TaskList columns={columns} />
          </div>
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
    </GanttProvider>
  );
}
