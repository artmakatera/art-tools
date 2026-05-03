export interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress?: number;
  dependencies?: readonly string[];
}

export interface GanttProps {
  tasks: readonly GanttTask[];
  rowHeight?: number;
  onTaskClick?: (task: GanttTask) => void;
}
