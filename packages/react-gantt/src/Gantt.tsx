import { Grid } from "./components/grid/Grid";
import type {
  GanttProps,

} from "./types";

import { useTaskList } from "./hooks/useTaskList";



export function Gantt({ tasks, rowHeight = 32, colWidth }: GanttProps) {
  const {tasksList, updateTask} =  useTaskList(tasks);

  return (
    <Grid
      tasks={tasksList}
      colWidth={colWidth}
      rowHeight={rowHeight}
      onUpdateTask={updateTask}
    />
  );
}
