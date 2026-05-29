import { useMemo } from 'react';
import { Grid } from './components/grid/Grid';
import type { GanttProps } from './types';
import { getTaskList } from './core/prepareData';

export function Gantt({ tasks, rowHeight = 32, colWidth }: GanttProps) {
  const taskList = useMemo(() => getTaskList(tasks), [tasks])
  return (
    <Grid tasks={taskList} colWidth={colWidth} rowHeight={rowHeight}  />
  );
}
