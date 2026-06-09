import { GanttProvider } from "./context/GanttContext";
import { GanttGrid } from "./components/grid/Grid";
import { TaskList } from "./components/taskList/TaskList";
import { TaskListDivider } from "./components/taskList/TaskListDivider";
import { useSidebarResize } from "./hooks/useSidebarResize";
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
  const { width: taskListWidth, onDividerMouseDown } = useSidebarResize(defaultTaskListWidth);
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
      <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start" }}>
        {showTaskList && (
          <>
            <div style={{ width: taskListWidth, flexShrink: 0 }}>
              <TaskList columns={columns} />
            </div>
            <TaskListDivider onMouseDown={onDividerMouseDown} />
          </>
        )}
        <GanttGrid />
      </div>
    </GanttProvider>
  );
}
