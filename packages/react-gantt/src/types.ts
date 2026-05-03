export interface Task {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress?: number;
  dependencies?: readonly string[];
}

export interface GanttProps {
  tasks: readonly Task[];
  rowHeight?: number;
  onTaskClick?: (task: Task) => void;
}
