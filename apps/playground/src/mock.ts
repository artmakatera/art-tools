import type { GanttTask, TaskDependency } from "@am/react-gantt";


export const mockTasks: GanttTask[] = [
  // ── Project 1 ───────────────────────────────────────────────
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
  },

  // ── Project 2 (nested: project → phase → sub-group → tasks) ──
  {
    id: "5",
    name: "Project 2",
    startDate: new Date("2026-01-08"),
    endDate: new Date("2026-01-28"),
    progress: 20,
    type: "project",
  },
  {
    id: "6",
    name: "Design phase",
    startDate: new Date("2026-01-08"),
    endDate: new Date("2026-01-14"),
    progress: 70,
    parentId: "5",
  },
  {
    id: "7",
    name: "UX work",
    startDate: new Date("2026-01-08"),
    endDate: new Date("2026-01-12"),
    progress: 80,
    parentId: "6",
  },
  {
    id: "8",
    name: "Wireframes",
    startDate: new Date("2026-01-08"),
    endDate: new Date("2026-01-10"),
    progress: 100,
    parentId: "7",
  },
  {
    id: "9",
    name: "Mockups",
    startDate: new Date("2026-01-10"),
    endDate: new Date("2026-01-12"),
    progress: 60,
    parentId: "7",
  },
  {
    id: "10",
    name: "Visual design",
    startDate: new Date("2026-01-12"),
    endDate: new Date("2026-01-14"),
    progress: 50,
    parentId: "6",
  },
  {
    id: "11",
    name: "Design review",
    startDate: new Date("2026-01-14"),
    type: "milestone",
    parentId: "6",
  },
  {
    id: "12",
    name: "Development phase",
    startDate: new Date("2026-01-14"),
    endDate: new Date("2026-01-28"),
    progress: 10,
    parentId: "5",
  },
  {
    id: "13",
    name: "Backend",
    startDate: new Date("2026-01-14"),
    endDate: new Date("2026-01-22"),
    progress: 20,
    parentId: "12",
  },
  {
    id: "14",
    name: "API endpoints",
    startDate: new Date("2026-01-14"),
    endDate: new Date("2026-01-19"),
    progress: 30,
    parentId: "13",
  },
  {
    id: "15",
    name: "Database schema",
    startDate: new Date("2026-01-16"),
    endDate: new Date("2026-01-22"),
    progress: 10,
    parentId: "13",
  },
  {
    id: "16",
    name: "Frontend",
    startDate: new Date("2026-01-18"),
    endDate: new Date("2026-01-28"),
    progress: 5,
    parentId: "12",
  },
  {
    id: "17",
    name: "Components",
    startDate: new Date("2026-01-18"),
    endDate: new Date("2026-01-24"),
    progress: 5,
    parentId: "16",
  },
  {
    id: "18",
    name: "Integration",
    startDate: new Date("2026-01-24"),
    endDate: new Date("2026-01-28"),
    progress: 0,
    parentId: "16",
  },

  // ── Project 3 (nested: project → phase → tasks) ─────────────
  {
    id: "19",
    name: "Project 3",
    startDate: new Date("2026-01-20"),
    endDate: new Date("2026-02-20"),
    progress: 0,
    type: "project",
  },
  {
    id: "20",
    name: "Discovery",
    startDate: new Date("2026-01-20"),
    endDate: new Date("2026-02-02"),
    progress: 20,
    parentId: "19",
  },
  {
    id: "21",
    name: "Research",
    startDate: new Date("2026-01-20"),
    endDate: new Date("2026-01-25"),
    progress: 40,
    parentId: "20",
  },
  {
    id: "22",
    name: "Prototype",
    startDate: new Date("2026-01-25"),
    endDate: new Date("2026-02-02"),
    progress: 0,
    parentId: "20",
  },
  {
    id: "23",
    name: "Delivery",
    startDate: new Date("2026-02-02"),
    endDate: new Date("2026-02-20"),
    progress: 0,
    parentId: "19",
  },
  {
    id: "24",
    name: "Testing",
    startDate: new Date("2026-02-02"),
    endDate: new Date("2026-02-09"),
    progress: 0,
    parentId: "23",
  },
  {
    id: "25",
    name: "Documentation",
    startDate: new Date("2026-02-02"),
    endDate: new Date("2026-02-12"),
    progress: 0,
    parentId: "23",
  },
  {
    id: "26",
    name: "QA sign-off",
    startDate: new Date("2026-02-09"),
    type: "milestone",
    parentId: "23",
  },
  {
    id: "27",
    name: "Release",
    startDate: new Date("2026-02-20"),
    type: "milestone",
    parentId: "23",
  },
];


export const mockDependencies: TaskDependency[] = [
  // ── Project 1 ───────────────────────────────────────────────
  { from: "1", to: "2", type: "FS" },           // Task 1 → Task 2
  { from: "2", to: "3", type: "FS", lag: 1 },   // Task 2 → Task 3 (+1 day)
  { from: "1", to: "4", type: "SS" },           // Task 1 ⇉ Milestone 1

  // ── Project 2 ───────────────────────────────────────────────
  { from: "8", to: "9", type: "FS" },           // Wireframes → Mockups
  { from: "9", to: "10", type: "FF", lag: 2 },  // Mockups ⇄ Visual design (+2 days)
  { from: "10", to: "11", type: "FS" },         // Visual design → Design review
  { from: "14", to: "15", type: "SS", lag: 1 }, // API endpoints ⇉ Database schema (+1 day)
  { from: "13", to: "17", type: "FS", lag: -1 },// Backend → Components (-1 day overlap)
  { from: "17", to: "18", type: "FS" },         // Components → Integration
  { from: "11", to: "16", type: "SF" },         // Design review ⇇ Frontend

  // ── Project 3 ───────────────────────────────────────────────
  { from: "21", to: "22", type: "FS" },         // Research → Prototype
  { from: "22", to: "24", type: "FS", lag: 3 }, // Prototype → Testing (+3 days)
  { from: "24", to: "25", type: "SS" },         // Testing ⇉ Documentation
  { from: "24", to: "26", type: "FS" },         // Testing → QA sign-off
  { from: "26", to: "27", type: "FF", lag: 1 }, // QA sign-off ⇄ Release (+1 day)
];
