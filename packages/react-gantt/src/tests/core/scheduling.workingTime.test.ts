import { describe, expect, it } from "vitest";

import { buildCalendar, calendarKey } from "../../core/calendar";
import { buildDependencyGraph, scheduleDependents } from "../../core/scheduling";
import type { SchedulingContext } from "../../core/taskDates";
import { countWorkingMs, isWorkingTime } from "../../core/workingTime";
import type { GanttCalendar, GanttTask, Id, TaskDependency } from "../../types";

// Jan 2026: Jan 1 Thu, Jan 2 Fri, Jan 3 Sat, Jan 4 Sun, Jan 5 Mon, Jan 6 Tue,
// Jan 7 Wed, Jan 8 Thu, Jan 9 Fri, Jan 10 Sat, Jan 11 Sun, Jan 12 Mon.
const jan = (day: number, hours = 0) => new Date(2026, 0, day, hours);

const contextFor = (calendar: GanttCalendar): SchedulingContext => ({
  calendar: buildCalendar(calendar, calendarKey(calendar)),
  durationUnit: "day",
  snapToWorking: true,
});

/** Whole days, weekends off — `duration: 1` is one whole working day. */
const weekdays = contextFor({ days: { 0: false, 6: false } });

const toMap = (tasks: GanttTask[]) => new Map<Id, GanttTask>(tasks.map((t) => [t.id, t]));

function move(current: Map<Id, GanttTask>, id: Id, startDate: Date, endDate?: Date) {
  const task = current.get(id);
  if (task) {
    current.set(id, { ...task, startDate, endDate });
  }
}

describe("schedule with a working-time calendar", () => {
  describe("FS dependency", () => {
    const graph = buildDependencyGraph([{ from: 1, to: 2, type: "FS" }]);
    const baseTasks = (): GanttTask[] => [
      { id: 1, name: "a", startDate: jan(5), endDate: jan(6) }, // Mon
      { id: 2, name: "b", startDate: jan(6), endDate: jan(7) }, // Tue
    ];

    it("carries a successor over the weekend rather than onto it", () => {
      const current = toMap(baseTasks());
      move(current, 1, jan(8), jan(10)); // predecessor now finishes Sat 00:00 (covers Thu+Fri)

      const changed = scheduleDependents(current, graph, 1, weekdays);

      // The exclusive finish lands on Saturday, which is not a valid start.
      expect(changed.get(2)?.startDate).toEqual(jan(12)); // Monday
      expect(changed.get(2)?.endDate).toEqual(jan(13)); // one working day preserved
    });

    it("measures lag in working days", () => {
      const laggedGraph = buildDependencyGraph([{ from: 1, to: 2, type: "FS", lag: 2 }]);
      const current = toMap(baseTasks());
      move(current, 1, jan(8), jan(9)); // finishes Fri 00:00

      const changed = scheduleDependents(current, laggedGraph, 1, weekdays);

      // Two WORKING days after Friday 00:00 is Tuesday, not Sunday.
      expect(changed.get(2)?.startDate).toEqual(jan(13));
    });

    it("does not pull a successor earlier when the predecessor moves back", () => {
      const current = toMap(baseTasks());
      move(current, 1, jan(1), jan(2));

      const changed = scheduleDependents(current, graph, 1, weekdays);

      expect(changed.size).toBe(0);
    });
  });

  describe("FF dependency", () => {
    it("decomposes the backward walk instead of folding lag into the offset", () => {
      // The old folded form — addDays(pred.end, lag - successorLength) — computes a
      // single offset from one anchor. Under working time the two terms are measured
      // from different anchors, so folding them lands on a different (and
      // non-working) day. This test IS the proof of the decomposition.
      const graph = buildDependencyGraph([{ from: 1, to: 2, type: "FF" }]);
      const current = toMap([
        // Predecessor covers Thu+Fri, finishing Mon Jan 12 00:00.
        { id: 1, name: "a", startDate: jan(8), endDate: jan(12) },
        // Successor is 4 working days long (Mon..Thu) and must be pushed forward.
        { id: 2, name: "b", startDate: jan(5), endDate: jan(9) },
      ]);

      const changed = scheduleDependents(current, graph, 1, weekdays);

      // Walking 4 WORKING days back from the finish gives Fri 9, Thu 8, Wed 7,
      // Tue 6 → start Tue Jan 6. The old folded form subtracted 4 CALENDAR days
      // and would have landed on Thu Jan 8, a whole different span.
      expect(changed.get(2)?.startDate).toEqual(jan(6));
      expect(changed.get(2)?.startDate).not.toEqual(jan(8));

      // The finish is normalized to its backward-anchored form, Sat Jan 10 00:00 —
      // the end of Friday's work. The predecessor's authored end is Mon Jan 12
      // 00:00. Those are different Date values but the SAME working moment: no work
      // happens between them. FF aligns finishes in working time, not in wall clock,
      // so that equivalence is what to assert.
      expect(changed.get(2)?.endDate).toEqual(jan(10));
      expect(countWorkingMs(weekdays.calendar, changed.get(2)!.endDate!, jan(12))).toBe(0);
    });

    it("projects the finish anchor backward at zero lag", () => {
      // With lag 0 there is no walk direction to infer from a sign, so the anchor
      // direction must be passed explicitly: a finish projects BACKWARD.
      const graph = buildDependencyGraph([{ from: 1, to: 2, type: "FF" }]);
      const current = toMap([
        { id: 1, name: "a", startDate: jan(8), endDate: jan(10) }, // finishes Sat 00:00
        { id: 2, name: "b", startDate: jan(5), endDate: jan(6) },
      ]);

      scheduleDependents(current, graph, 1, weekdays);

      // Saturday is not a working finish; it projects back to Fri 24:00 == Sat 00:00,
      // so the successor's own finish stays on a real working boundary.
      const successor = current.get(2)!;
      expect(successor.startDate).toEqual(jan(9));
      expect(successor.endDate).toEqual(jan(10));
    });
  });

  describe("SF dependency", () => {
    it("finishes the successor where the predecessor starts", () => {
      const graph = buildDependencyGraph([{ from: 1, to: 2, type: "SF" }]);
      const current = toMap([
        { id: 1, name: "a", startDate: jan(5), endDate: jan(6) }, // starts Mon
        { id: 2, name: "b", startDate: jan(1), endDate: jan(2) }, // 1 working day
      ]);

      move(current, 1, jan(12), jan(13)); // predecessor moves to the following Monday
      scheduleDependents(current, graph, 1, weekdays);

      const successor = current.get(2)!;
      // The finish anchor projects BACKWARD off Monday 00:00 onto Sat Jan 10 00:00,
      // which is the same moment as the end of Friday's work and is the canonical
      // backward-anchored form. The successor therefore occupies Friday.
      expect(successor.startDate).toEqual(jan(9));
      expect(successor.endDate).toEqual(jan(10));
    });
  });

  it("never leaves a rescheduled task starting on a non-working day", () => {
    const graph = buildDependencyGraph([
      { from: 1, to: 2, type: "FS" },
      { from: 2, to: 3, type: "FS" },
      { from: 3, to: 4, type: "FS" },
    ]);
    const current = toMap([
      { id: 1, name: "a", startDate: jan(1), endDate: jan(2) },
      { id: 2, name: "b", startDate: jan(1), endDate: jan(2) },
      { id: 3, name: "c", startDate: jan(1), endDate: jan(2) },
      { id: 4, name: "d", startDate: jan(1), endDate: jan(2) },
    ]);

    scheduleDependents(current, graph, 1, weekdays);

    for (const id of [2, 3, 4]) {
      const task = current.get(id)!;
      expect(isWorkingTime(weekdays.calendar, task.startDate)).toBe(true);
    }
  });

  it("is idempotent — running the cascade twice changes nothing", () => {
    // The lower-bound comparison is a strict instant comparison, so a projection
    // that were not a fixpoint would keep firing and silently exhaust the iteration
    // guard, leaving a wrong-but-stable schedule that nothing reports.
    const dependencies: TaskDependency[] = [
      { from: 1, to: 2, type: "FS" },
      { from: 2, to: 3, type: "FF" },
      { from: 1, to: 3, type: "SS", lag: 1 },
      { from: 3, to: 4, type: "SF" },
    ];
    const graph = buildDependencyGraph(dependencies);
    const current = toMap([
      { id: 1, name: "a", startDate: jan(3), endDate: jan(6) }, // starts on a Saturday
      { id: 2, name: "b", startDate: jan(4), endDate: jan(7) },
      { id: 3, name: "c", startDate: jan(1), endDate: jan(3) },
      { id: 4, name: "d", startDate: jan(10), endDate: jan(12) },
    ]);

    scheduleDependents(current, graph, 1, weekdays);
    const settled = new Map([...current].map(([id, t]) => [id, { ...t }]));

    const secondPass = scheduleDependents(current, graph, 1, weekdays);

    expect(secondPass.size).toBe(0);
    for (const [id, task] of settled) {
      expect(current.get(id)!.startDate).toEqual(task.startDate);
      expect(current.get(id)!.endDate).toEqual(task.endDate);
    }
  });

  it("terminates on a dependency cycle", () => {
    const graph = buildDependencyGraph([
      { from: 1, to: 2, type: "FS" },
      { from: 2, to: 1, type: "FS" },
    ]);
    const current = toMap([
      { id: 1, name: "a", startDate: jan(5), endDate: jan(6) },
      { id: 2, name: "b", startDate: jan(5), endDate: jan(6) },
    ]);

    expect(() => scheduleDependents(current, graph, 1, weekdays)).not.toThrow();
  });

  it("keeps a milestone's end mirroring its start", () => {
    const graph = buildDependencyGraph([{ from: 1, to: 2, type: "FS" }]);
    const current = toMap([
      { id: 1, name: "a", startDate: jan(5), endDate: jan(6) },
      { id: 2, name: "m", type: "milestone" as const, startDate: jan(1), endDate: jan(1) },
    ]);

    const changed = scheduleDependents(current, graph, 1, weekdays);

    const milestone = changed.get(2)!;
    expect(milestone.startDate).toEqual(jan(6));
    expect(milestone.endDate).toEqual(milestone.startDate);
  });
});
