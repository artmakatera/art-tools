import type { GanttTask, TaskDependency } from "@am/react-gantt";

// Converted from the Bryntum project format:
//   percentDone → progress, children flattened into parentId links,
//   the root summary → type "project", a zero-duration node → "milestone".
// Intraday times are dropped: this chart is day-granular and treats endDate as
// the last (inclusive) day.

export const mockTasks: GanttTask[] = [
  {
    id: 1000,
    name: "Launch SaaS Product",
    startDate: new Date("2022-01-10"),
    endDate: new Date("2022-01-21"),
    progress: 27,
    type: "project",
  },

//   // ── Setup web server ────────────────────────────────────────
  {
    id: 1,
    name: "Setup web server",
    startDate: new Date("2022-01-10"),
    endDate: new Date("2022-01-13"),
    progress: 33.3,
    parentId: 1000,
  },
  {
    id: 11,
    name: "Install Apache",
    startDate: new Date("2022-01-10"),
    endDate: new Date("2022-01-10"),
    progress: 50,
    parentId: 1,
  },
  {
    id: 12,
    name: "Configure firewall",
    startDate: new Date("2022-01-10"),
    endDate: new Date("2022-01-11"),
    progress: 50,
    parentId: 1,
  },
//   {
//     id: 13,
//     name: "Setup load balancer",
//     startDate: new Date("2022-01-10"),
//     endDate: new Date("2022-01-10"),
//     progress: 50,
//     parentId: 1,
//   },
//   {
//     id: 14,
//     name: "Configure ports",
//     startDate: new Date("2022-01-10"),
//     endDate: new Date("2022-01-10"),
//     progress: 50,
//     parentId: 1,
//   },
//   {
//     id: 15,
//     name: "Run tests",
//     startDate: new Date("2022-01-11"),
//     endDate: new Date("2022-01-13"),
//     progress: 0,
//     parentId: 1,
//   },

//   // ── Website Design ──────────────────────────────────────────
//   {
//     id: 2,
//     name: "Website Design",
//     startDate: new Date("2022-01-13"),
//     endDate: new Date("2022-01-21"),
//     progress: 39.3,
//     parentId: 1000,
//   },
//   {
//     id: 21,
//     name: "Contact designers",
//     startDate: new Date("2022-01-13"),
//     endDate: new Date("2022-01-14"),
//     progress: 70,
//     parentId: 2,
//   },
//   {
//     id: 22,
//     name: "Create shortlist of three designers",
//     startDate: new Date("2022-01-14"),
//     endDate: new Date("2022-01-17"),
//     progress: 60,
//     parentId: 2,
//   },
//   {
//     id: 23,
//     name: "Select & review final design",
//     startDate: new Date("2022-01-17"),
//     endDate: new Date("2022-01-19"),
//     progress: 50,
//     parentId: 2,
//   },
//   {
//     id: 24,
//     name: "Inform management about decision",
//     startDate: new Date("2022-01-19"),
//     progress: 100,
//     type: "milestone",
//     parentId: 2,
//   },
//   {
//     id: 25,
//     name: "Apply design to web site",
//     startDate: new Date("2022-01-19"),
//     endDate: new Date("2022-01-21"),
//     progress: 0,
//     parentId: 2,
//   },

//   // ── Setup Test Strategy ─────────────────────────────────────
//   {
//     id: 3,
//     name: "Setup Test Strategy",
//     startDate: new Date("2022-01-10"),
//     endDate: new Date("2022-01-14"),
//     progress: 15,
//     parentId: 1000,
//   },
//   {
//     id: 31,
//     name: "Hire QA staff",
//     startDate: new Date("2022-01-10"),
//     endDate: new Date("2022-01-12"),
//     progress: 40,
//     parentId: 3,
//   },
//   {
//     id: 33,
//     name: "Write test specs",
//     startDate: new Date("2022-01-12"),
//     endDate: new Date("2022-01-14"),
//     progress: 6.7,
//     parentId: 3,
//   },
//   {
//     id: 331,
//     name: "Unit tests",
//     startDate: new Date("2022-01-12"),
//     endDate: new Date("2022-01-13"),
//     progress: 20,
//     parentId: 33,
//   },
//   {
//     id: 332,
//     name: "UI unit tests / individual screens",
//     startDate: new Date("2022-01-12"),
//     endDate: new Date("2022-01-14"),
//     progress: 10,
//     parentId: 33,
//   },
  {
    id: 333,
    name: "Application tests",
    startDate: new Date("2022-01-01"),
    endDate: new Date("2022-01-2"),
    progress: 0,
    // parentId: 33,
  },
  {
    id: 334,
    name: "Monkey tests",
    startDate: new Date("2022-01-20"),
    endDate: new Date("2022-01-22"),
    progress: 0,
    // parentId: 33,
  },
];


// Bryntum dependencies with no `type` default to finish-to-start (FS).
export const mockDependencies: TaskDependency[] = [
  // { from: 11, to: 15, type: "FS" }, // Install Apache → Run tests
  { from: 11, to: 12, type: "FF" }, // Install Apache → Run tests
  // { from: 12, to: 15, type: "FS" }, // Configure firewall → Run tests
  // { from: 13, to: 15, type: "FS" }, // Setup load balancer → Run tests
  // { from: 14, to: 15, type: "FS" }, // Configure ports → Run tests
  // { from: 15, to: 21, type: "FS" }, // Run tests → Contact designers
  // { from: 21, to: 22, type: "FS" }, // Contact designers → Create shortlist
  // { from: 22, to: 23, type: "FS" }, // Create shortlist → Select & review final design
  // { from: 23, to: 24, type: "FS" }, // Select & review → Inform management (milestone)
  // { from: 24, to: 25, type: "FS" }, // Inform management → Apply design to web site
  // { from: 31, to: 331, type: "FS" }, // Hire QA staff → Unit tests
  // { from: 31, to: 332, type: "FS" }, // Hire QA staff → UI unit tests
  // { from: 31, to: 333, type: "FS" }, // Hire QA staff → Application tests
  // { from: 31, to: 334, type: "FS" }, // Hire QA staff → Monkey tests
];
