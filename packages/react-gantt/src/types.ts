type GanttTaskType = "task" | "milestone" | "project"

export type CalendarUnit = "day" | "week" | "month" | "quarter" | "year";


export type Scale = {
  unit: CalendarUnit;
  step: number;
  format: (date: Date) => string;
};

export type Id = string | number;


export interface GanttTask {
  id: Id;
  name: string;

  startDate: Date;
  endDate?: Date;
  duration?: number;
  progress?: number;
 dependency?: string;
  type?: GanttTaskType;
  parentId?: Id | null;
}

export interface GanttProps {
  tasks: readonly GanttTask[];
  rowHeight?: number;
  onTaskClick?: (task: GanttTask) => void;
}



export interface TaskState {
  startDate: Date;
  endDate?: Date;
  progress: number;
}