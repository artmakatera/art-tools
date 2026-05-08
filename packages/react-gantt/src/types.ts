type GanttTaskType = "task" | "milestone" | "projects"

export type CalendarUnit = "day" | "week" | "month" | "quarter" | "year";


export type Scale = {
  unit: CalendarUnit;
  step: number;
  format: (date: Date) => string;
};


export interface GanttTask {
  id: string | number;
  name: string;

  startDate: Date;
  endDate?: Date;
  duration?: number;
  progress?: number;
 dependency?: string;
  type?: GanttTaskType;
}

export interface GanttProps {
  tasks: readonly GanttTask[];
  rowHeight?: number;
  onTaskClick?: (task: GanttTask) => void;
}
