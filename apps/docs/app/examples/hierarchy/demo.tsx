"use client";

import { Gantt } from "@am-tools/react-gantt";
import { treeTasks } from "@/lib/demo-tasks";

/**
 * Nesting is expressed with `parentId` on a flat array — there is no `children`
 * field. `type` picks the bar shape:
 *
 *   "summary"   — a bracket whose dates roll up from its children (so it is
 *                 read-only: moving it would be overwritten on the next render)
 *   "milestone" — a diamond at `startDate`; it has no `endDate`
 *   "task"      — the default bar, with a progress fill
 */
export function HierarchyDemo() {
  return <Gantt tasks={treeTasks} height={380} />;
}
