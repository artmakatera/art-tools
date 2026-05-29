import type { GanttTask } from "@am/react-gantt";


export const mockTasks: GanttTask[] = [
  {
    id: "0",
    name: "Project 1",
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-01-10"),
    progress: 40,
    type: "project",
  },
  {
    id: "1",
    name: "Task 1",
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-01-05"),
    progress: 50,
    parentId: "0",
  },
  {
    id: "2",
    name: "Task 2",
    startDate: new Date("2026-01-03"),
    endDate: new Date("2026-01-08"),
    progress: 30,
    parentId: "0",
  },
  {
    id: "3",
    name: "Task 3",
    startDate: new Date("2026-01-06"),
    endDate: new Date("2026-01-10"),
    progress: 80,
    parentId: "0",

  },

  {
    id: "4",
    name: "Milestone 1",
    startDate: new Date("2026-01-05"),
    type: "milestone",
    parentId: "0",

  }
];