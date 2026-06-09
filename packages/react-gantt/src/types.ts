import type React from "react";

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
  type?: GanttTaskType;
  parentId?: Id | null;

}


export interface ColumnDef<T extends GanttTask = GanttTask> {
  key: string;
  header: string;
  width?: number;
  render: (task: T) => React.ReactNode;
}

export interface GanttProps {
  tasks: GanttTask[];
  rowHeight?: number;
  colWidth?: number;
  scales?: Scale[];
  padDays?: number;
  onTaskClick?: (task: GanttTask) => void;
  dependencies?: TaskDependency[];
  columns?: ColumnDef[];
  defaultTaskListWidth?: number;
  onDependencyCreate?: (dep: TaskDependency) => void;
  onDependencyDelete?: (dep: TaskDependency) => void;
}



export interface TaskState {
  startDate: Date;
  endDate?: Date;
  progress: number;
}


export type Overrides = Record<Id, Partial<TaskState>>;

type CommandType = "create" | "update" | "delete";
export type TaskCommand = {
  type: CommandType;
  task: GanttTask;
};

export type CommittedOverrides = Record<Id, TaskCommand[]>;


export type TaskDependencyType = "FS" | "FF" | "SS" | "SF";


export type TaskDependency = {
  from: Id;
  to: Id;
  type: TaskDependencyType;
  lag?: number;
}