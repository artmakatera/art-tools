// @vitest-environment node
import { bench, describe } from "vitest";
import type { GanttTask, Id } from "../src/types";
import {
  applyTransaction,
  getTaskList,
  seedResolvedTasks,
  type ResolvedTaskMap,
} from "../src/core/prepareData";
import { buildDatesFromTasks } from "../src/core/dateUtils";
import { LINEAR_CONTEXT } from "../src/core/taskDates";

const DAY_MS = 86_400_000;
const PROJECT_START = new Date(2026, 0, 1).getTime();

function generateTree(count: number): GanttTask[] {
  const tasks: GanttTask[] = [];
  const groups = Math.ceil(count / 10);
  for (let g = 0; g < groups; g++) {
    const parentId = `g${g}`;
    tasks.push({
      id: parentId,
      name: `Group ${g + 1}`,
      type: "summary",
      startDate: new Date(PROJECT_START),
      endDate: new Date(PROJECT_START + DAY_MS),
    });
    for (let i = 0; i < 10 && g * 10 + i < count; i++) {
      const index = g * 10 + i;
      const start = new Date(PROJECT_START + (index % 700) * DAY_MS);
      tasks.push({
        id: String(index),
        name: `Task ${index + 1}`,
        parentId,
        startDate: start,
        endDate: new Date(start.getTime() + DAY_MS * 5),
        progress: index % 100,
      });
    }
  }
  return tasks;
}

for (const size of [1_000, 10_000]) {
  describe(`data layer — ${size} tasks`, () => {
    const tasks = generateTree(size);
    const resolved: ResolvedTaskMap = seedResolvedTasks(tasks);
    const list = getTaskList(resolved, LINEAR_CONTEXT);
    const target = tasks.find((t) => t.parentId != null)!;
    let n = 0;

    bench("1. applyTransaction (map clone + one set)", () => {
      applyTransaction(resolved, [
        { type: "update", task: { ...target, progress: n++ % 100 } },
      ]);
    });

    bench("2. getTaskList (group + flatten + roll-up)", () => {
      getTaskList(resolved, LINEAR_CONTEXT);
    });

    bench("3. useExpand passes (parentIds + taskById + visibleTasks)", () => {
      const parentIds = new Set<Id>();
      for (const t of list) {
        if (t.parentId != null) {
          parentIds.add(t.parentId);
        }
      }
      const byId = new Map<Id, GanttTask>();
      for (const t of list) {
        byId.set(t.id, t);
      }
      const expanded = new Set<Id>();
      for (const id of parentIds) {
        expanded.add(id);
      }
    });

    bench("4. buildDatesFromTasks (min/max + column Dates)", () => {
      // A fresh array each call: the memo is identity-keyed, and every update
      // produces a new visibleTasks array, so the cache never hits.
      buildDatesFromTasks(list.slice(), 3);
    });
  });
}
