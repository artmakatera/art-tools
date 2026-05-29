import { Grid } from "./components/grid/Grid";
import type {
  GanttProps,

} from "./types";

import { useTaskList } from "./hooks/useTaskList";



export function Gantt({ tasks, rowHeight = 32, colWidth }: GanttProps) {
  const {tasksList, overrides, updateTask, commitTask} =  useTaskList(tasks);

  return (
    <Grid
      tasks={tasksList}
      colWidth={colWidth}
      rowHeight={rowHeight}
      overrides={overrides}
      onUpdateTask={updateTask}
      onCommitTask={commitTask}
    />
  );
}
