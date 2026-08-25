import { describe, expect, it } from "vitest";

import { buildCalendar, calendarKey } from "../../core/calendar";
import { computeCriticalPath } from "../../core/criticalPath";
import { buildDependencyGraph } from "../../core/scheduling";
import { LINEAR_CONTEXT, type SchedulingContext } from "../../core/taskDates";
import type { GanttCalendar, GanttTask, Id, TaskDependency } from "../../types";

/** A local-midnight day in January 2022 (matches scheduling.test.ts's day math). */
const jan = (day: number) => new Date(2022, 0, day);

const toMap = (tasks: GanttTask[]) => new Map<Id, GanttTask>(tasks.map((t) => [t.id, t]));

describe("computeCriticalPath", () => {
  it("returns nothing for an empty chart", () => {
    const result = computeCriticalPath(new Map(), buildDependencyGraph([]), LINEAR_CONTEXT);
    expect(result.criticalTaskIds.size).toBe(0);
    expect(result.criticalDependencyKeys.size).toBe(0);
  });

  it("flags a whole linear chain critical, with every edge binding", () => {
    const tasks = toMap([
      { id: 1, name: "a", startDate: jan(1), endDate: jan(3) }, // 2 days
      { id: 2, name: "b", startDate: jan(3), endDate: jan(5) }, // 2 days
      { id: 3, name: "c", startDate: jan(5), endDate: jan(8) }, // 3 days
    ]);
    const dependencies: TaskDependency[] = [
      { from: 1, to: 2, type: "FS" },
      { from: 2, to: 3, type: "FS" },
    ];
    const graph = buildDependencyGraph(dependencies);

    const result = computeCriticalPath(tasks, graph, LINEAR_CONTEXT);

    expect(result.criticalTaskIds).toEqual(new Set([1, 2, 3]));
    expect(result.criticalDependencyKeys).toEqual(new Set(["1->2", "2->3"]));
  });

  it("a diamond: only the binding branch and its edges are critical", () => {
    // A -FS-> B -FS-> D (tight, no gap) and A -FS-> C -FS-> D (C has slack:
    // it finishes long before D actually needs to start).
    const tasks = toMap([
      { id: 1, name: "a", startDate: jan(1), endDate: jan(5) }, // 4 days
      { id: 2, name: "b", startDate: jan(5), endDate: jan(9) }, // 4 days, tight into D
      { id: 3, name: "c", startDate: jan(5), endDate: jan(6) }, // 1 day, then idle until D
      { id: 4, name: "d", startDate: jan(9), endDate: jan(11) }, // 2 days
    ]);
    const dependencies: TaskDependency[] = [
      { from: 1, to: 2, type: "FS" },
      { from: 1, to: 3, type: "FS" },
      { from: 2, to: 4, type: "FS" },
      { from: 3, to: 4, type: "FS" },
    ];
    const graph = buildDependencyGraph(dependencies);

    const result = computeCriticalPath(tasks, graph, LINEAR_CONTEXT);

    expect(result.criticalTaskIds).toEqual(new Set([1, 2, 4]));
    expect(result.criticalDependencyKeys).toEqual(new Set(["1->2", "2->4"]));
  });

  it("flags every branch critical when two parallel chains tie exactly", () => {
    const tasks = toMap([
      { id: 1, name: "a", startDate: jan(1), endDate: jan(5) }, // 4 days
      { id: 2, name: "b", startDate: jan(5), endDate: jan(9) }, // 4 days
      { id: 3, name: "c", startDate: jan(5), endDate: jan(9) }, // 4 days, tied with b
      { id: 4, name: "d", startDate: jan(9), endDate: jan(11) }, // 2 days
    ]);
    const dependencies: TaskDependency[] = [
      { from: 1, to: 2, type: "FS" },
      { from: 1, to: 3, type: "FS" },
      { from: 2, to: 4, type: "FS" },
      { from: 3, to: 4, type: "FS" },
    ];
    const graph = buildDependencyGraph(dependencies);

    const result = computeCriticalPath(tasks, graph, LINEAR_CONTEXT);

    expect(result.criticalTaskIds).toEqual(new Set([1, 2, 3, 4]));
    expect(result.criticalDependencyKeys).toEqual(new Set(["1->2", "1->3", "2->4", "3->4"]));
  });

  it("a graph with no dependencies: only the task that actually reaches the end is critical", () => {
    const tasks = toMap([
      { id: 1, name: "x", startDate: jan(1), endDate: jan(5) }, // reaches the actual end
      { id: 2, name: "y", startDate: jan(1), endDate: jan(3) }, // shorter, unrelated, has slack
    ]);
    const graph = buildDependencyGraph([]);

    const result = computeCriticalPath(tasks, graph, LINEAR_CONTEXT);

    expect(result.criticalTaskIds).toEqual(new Set([1]));
    expect(result.criticalDependencyKeys.size).toBe(0);
  });

  it("keeps a milestone at the end of a chain critical", () => {
    const tasks = toMap([
      { id: 1, name: "a", startDate: jan(1), endDate: jan(3) },
      { id: 2, name: "m", type: "milestone" as const, startDate: jan(3), endDate: jan(3) },
    ]);
    const graph = buildDependencyGraph([{ from: 1, to: 2, type: "FS" }]);

    const result = computeCriticalPath(tasks, graph, LINEAR_CONTEXT);

    expect(result.criticalTaskIds).toEqual(new Set([1, 2]));
    expect(result.criticalDependencyKeys).toEqual(new Set(["1->2"]));
  });

  it("terminates on a dependency cycle instead of hanging", () => {
    const tasks = toMap([
      { id: 1, name: "a", startDate: jan(5), endDate: jan(6) },
      { id: 2, name: "b", startDate: jan(5), endDate: jan(6) },
    ]);
    const graph = buildDependencyGraph([
      { from: 1, to: 2, type: "FS" },
      { from: 2, to: 1, type: "FS" },
    ]);

    expect(() => computeCriticalPath(tasks, graph, LINEAR_CONTEXT)).not.toThrow();
  });

  describe("SS dependency, tight", () => {
    it("flags both tasks and the edge critical", () => {
      const tasks = toMap([
        { id: 1, name: "a", startDate: jan(1), endDate: jan(2) }, // 1 day
        { id: 2, name: "b", startDate: jan(1), endDate: jan(6) }, // 5 days, starts together
      ]);
      const graph = buildDependencyGraph([{ from: 1, to: 2, type: "SS" }]);

      const result = computeCriticalPath(tasks, graph, LINEAR_CONTEXT);

      expect(result.criticalTaskIds).toEqual(new Set([1, 2]));
      expect(result.criticalDependencyKeys).toEqual(new Set(["1->2"]));
    });
  });

  describe("FF dependency, tight", () => {
    it("flags both tasks and the edge critical", () => {
      const tasks = toMap([
        { id: 1, name: "a", startDate: jan(1), endDate: jan(6) }, // 5 days
        { id: 2, name: "b", startDate: jan(4), endDate: jan(6) }, // 2 days, finishes together
      ]);
      const graph = buildDependencyGraph([{ from: 1, to: 2, type: "FF" }]);

      const result = computeCriticalPath(tasks, graph, LINEAR_CONTEXT);

      expect(result.criticalTaskIds).toEqual(new Set([1, 2]));
      expect(result.criticalDependencyKeys).toEqual(new Set(["1->2"]));
    });
  });

  describe("SF dependency, tight", () => {
    it("flags a tight SF link in the middle of a chain critical", () => {
      // a -SF-> b -FS-> c: b finishes exactly where a starts, and b's finish
      // exactly starts c. c is deliberately the longest so it is the actual sink.
      const tasks = toMap([
        { id: 1, name: "a", startDate: jan(10), endDate: jan(13) }, // 3 days
        { id: 2, name: "b", startDate: jan(8), endDate: jan(10) }, // 2 days, finishes at a's start
        { id: 3, name: "c", startDate: jan(10), endDate: jan(20) }, // 10 days, the real sink
      ]);
      const graph = buildDependencyGraph([
        { from: 1, to: 2, type: "SF" },
        { from: 2, to: 3, type: "FS" },
      ]);

      const result = computeCriticalPath(tasks, graph, LINEAR_CONTEXT);

      expect(result.criticalTaskIds).toEqual(new Set([1, 2, 3]));
      expect(result.criticalDependencyKeys).toEqual(new Set(["1->2", "2->3"]));
    });
  });

  describe("with a working-time calendar", () => {
    // Jan 2026: Jan 1 Thu, Jan 2 Fri, Jan 3 Sat, Jan 4 Sun, Jan 5 Mon, Jan 6 Tue.
    const jan26 = (day: number) => new Date(2026, 0, day);
    const contextFor = (calendar: GanttCalendar): SchedulingContext => ({
      calendar: buildCalendar(calendar, calendarKey(calendar)),
      durationUnit: "day",
      snapToWorking: true,
    });
    const weekdays = contextFor({ days: { 0: false, 6: false } });

    it("has zero float across a weekend gap, not two calendar days of slack", () => {
      // a occupies Thu+Fri (2 working days), ending Sat 00:00 — a non-working
      // instant. b starts the very next WORKING instant, Monday, with no
      // working-day gap at all, despite two calendar days between them.
      const tasks = toMap([
        { id: 1, name: "a", startDate: jan26(1), endDate: jan26(3) }, // Thu 00:00 -> Sat 00:00
        { id: 2, name: "b", startDate: jan26(5), endDate: jan26(6) }, // Mon -> Tue, 1 day
      ]);
      const graph = buildDependencyGraph([{ from: 1, to: 2, type: "FS" }]);

      const result = computeCriticalPath(tasks, graph, weekdays);

      expect(result.criticalTaskIds).toEqual(new Set([1, 2]));
      expect(result.criticalDependencyKeys).toEqual(new Set(["1->2"]));
    });

    it("still reports real slack measured in working days, not calendar days", () => {
      // Same shape, but b starts a working day later than it needs to (Tuesday
      // instead of Monday) — one real working day of float.
      const tasks = toMap([
        { id: 1, name: "a", startDate: jan26(1), endDate: jan26(3) }, // Thu -> Sat 00:00
        { id: 2, name: "b", startDate: jan26(6), endDate: jan26(7) }, // Tue -> Wed, 1 day
      ]);
      const graph = buildDependencyGraph([{ from: 1, to: 2, type: "FS" }]);

      const result = computeCriticalPath(tasks, graph, weekdays);

      // b is the sink and determines the project end, so it is always critical
      // by construction; a now has a full working day of slack before it.
      expect(result.criticalTaskIds).toEqual(new Set([2]));
      expect(result.criticalDependencyKeys.size).toBe(0);
    });
  });
});
