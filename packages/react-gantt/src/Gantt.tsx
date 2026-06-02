import { Grid } from "./components/grid/Grid";
import type {
  GanttProps,

} from "./types";

import { useTaskList } from "./hooks/useTaskList";



export function Gantt({ tasks, dependencies, rowHeight = 32, colWidth, onTaskClick }: GanttProps) {
  const {tasksList, updateTask} =  useTaskList(tasks, dependencies);

  return (
    <Grid
      tasks={tasksList}
      colWidth={colWidth}
      rowHeight={rowHeight}
      onUpdateTask={updateTask}
      dependencies={dependencies}
      onTaskClick={onTaskClick}
    />
  );
}
