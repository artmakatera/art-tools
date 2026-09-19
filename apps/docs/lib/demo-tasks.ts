import type { GanttTask, TaskDependency } from "@art-tools/react-gantt";

/**
 * Small, readable fixtures for the examples.
 *
 * Dates always use the `(year, monthIndex, day)` constructor — never an ISO
 * string, which parses as UTC midnight and would place bars a day off for
 * anyone west of Greenwich (the library's geometry reads local civil dates).
 *
 * `endDate` is the EXCLUSIVE instant work stops: a task running Jan 5..8 stores
 * Jan 9. Use `ColumnApi.format.endDate` when showing an end date to a user.
 *
 * These are module-level constants on purpose: `<Gantt>` treats `tasks` as an
 * identity-stable seed for its change log, so a fresh array on every render
 * would discard edits.
 */

/** Four flat tasks — the minimum needed to show a feature without noise. */
export const simpleTasks: GanttTask[] = [
  {
    id: "spec",
    name: "Write spec",
    startDate: new Date(2026, 0, 5),
    endDate: new Date(2026, 0, 10),
    progress: 100,
  },
  {
    id: "build",
    name: "Build feature",
    startDate: new Date(2026, 0, 12),
    endDate: new Date(2026, 0, 24),
    progress: 60,
  },
  {
    id: "review",
    name: "Code review",
    startDate: new Date(2026, 0, 26),
    endDate: new Date(2026, 0, 29),
    progress: 20,
  },
  {
    id: "ship",
    name: "Ship it",
    startDate: new Date(2026, 0, 29),
    endDate: new Date(2026, 0, 31),
    progress: 0,
  },
];

/** A two-level tree exercising all three bar types. */
export const treeTasks: GanttTask[] = [
  {
    id: "phase-1",
    name: "Discovery",
    type: "summary",
    startDate: new Date(2026, 0, 5),
    endDate: new Date(2026, 0, 17),
  },
  {
    id: "interviews",
    name: "User interviews",
    parentId: "phase-1",
    startDate: new Date(2026, 0, 5),
    endDate: new Date(2026, 0, 10),
    progress: 100,
  },
  {
    id: "synthesis",
    name: "Synthesis",
    parentId: "phase-1",
    startDate: new Date(2026, 0, 12),
    endDate: new Date(2026, 0, 17),
    progress: 75,
  },
  {
    id: "phase-2",
    name: "Delivery",
    type: "summary",
    startDate: new Date(2026, 0, 19),
    endDate: new Date(2026, 1, 7),
  },
  {
    id: "implement",
    name: "Implementation",
    parentId: "phase-2",
    startDate: new Date(2026, 0, 19),
    endDate: new Date(2026, 1, 3),
    progress: 40,
  },
  {
    id: "qa",
    name: "QA pass",
    parentId: "phase-2",
    startDate: new Date(2026, 1, 3),
    endDate: new Date(2026, 1, 7),
    progress: 0,
  },
  {
    id: "launch",
    name: "Launch",
    type: "milestone",
    startDate: new Date(2026, 1, 9),
  },
];

/** Four tasks positioned so each of the four link types is visible. */
export const linkedTasks: GanttTask[] = [
  {
    id: "a",
    name: "Design",
    startDate: new Date(2026, 0, 5),
    endDate: new Date(2026, 0, 10),
    progress: 100,
  },
  {
    id: "b",
    name: "Build (FS from Design)",
    startDate: new Date(2026, 0, 12),
    endDate: new Date(2026, 0, 21),
    progress: 50,
  },
  {
    id: "c",
    name: "Docs (SS with Build)",
    startDate: new Date(2026, 0, 12),
    endDate: new Date(2026, 0, 17),
    progress: 30,
  },
  {
    id: "d",
    name: "Sign-off (FF with Build)",
    startDate: new Date(2026, 0, 15),
    endDate: new Date(2026, 0, 21),
    progress: 0,
  },
];

export const linkedDependencies: TaskDependency[] = [
  { from: "a", to: "b", type: "FS" },
  { from: "b", to: "c", type: "SS" },
  { from: "b", to: "d", type: "FF" },
];

/**
 * Two branches off a shared kickoff: Design → Build → Launch is the only chain
 * with zero float — it alone pins the chart's end date. Research → Prototype
 * runs in parallel but finishes nine days early, so it has slack and stays
 * unhighlighted even though it shares Kickoff with the critical chain.
 */
export const criticalPathTasks: GanttTask[] = [
  {
    id: "kickoff",
    name: "Kickoff",
    startDate: new Date(2026, 0, 5),
    endDate: new Date(2026, 0, 9),
    progress: 100,
  },
  {
    id: "design",
    name: "Design",
    startDate: new Date(2026, 0, 9),
    endDate: new Date(2026, 0, 16),
    progress: 100,
  },
  {
    id: "build",
    name: "Build",
    startDate: new Date(2026, 0, 16),
    endDate: new Date(2026, 0, 30),
    progress: 20,
  },
  {
    id: "launch",
    name: "Launch",
    type: "milestone",
    startDate: new Date(2026, 0, 30),
  },
  {
    id: "research",
    name: "Research (parallel, has slack)",
    startDate: new Date(2026, 0, 9),
    endDate: new Date(2026, 0, 13),
    progress: 100,
  },
  {
    id: "prototype",
    name: "Prototype (parallel, has slack)",
    startDate: new Date(2026, 0, 13),
    endDate: new Date(2026, 0, 20),
    progress: 60,
  },
];

export const criticalPathDependencies: TaskDependency[] = [
  { from: "kickoff", to: "design", type: "FS" },
  { from: "design", to: "build", type: "FS" },
  { from: "build", to: "launch", type: "FS" },
  { from: "kickoff", to: "research", type: "FS" },
  { from: "research", to: "prototype", type: "FS" },
];
