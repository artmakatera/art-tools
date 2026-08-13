import { describe, expect, it } from "vitest";

import type { GanttTask, Id, TaskDependency } from "../../types";
import {
  buildDependencyGraph,
  scheduleDependents,
} from "../../core/scheduling";

/** A local-midnight day in January 2022 (matches the scheduler's day math). */
const jan = (day: number) => new Date(2022, 0, day);

const toMap = (tasks: GanttTask[]) =>
  new Map<Id, GanttTask>(tasks.map((t) => [t.id, t]));

/** Replace a task in the working set with a moved copy (simulates a drag). */
function move(
  current: Map<Id, GanttTask>,
  id: Id,
  startDate: Date,
  endDate?: Date,
) {
  const task = current.get(id);
  if (task) current.set(id, { ...task, startDate, endDate });
}

describe("schedule", () => {
  it("respects dependencies", () => {
    const graph = buildDependencyGraph([{ from: 1, to: 2, type: "FS" }]);
    const current = toMap([
      { id: 1, name: "a", startDate: jan(10), endDate: jan(13) },
      { id: 2, name: "b", startDate: jan(10), endDate: jan(13) }, // violates FS
    ]);

    const changed = scheduleDependents(current, graph, 1);

    // finish-to-start → successor starts the day after the predecessor finishes
    expect(changed.get(2)?.startDate).toEqual(jan(13));
    expect(changed.get(2)?.endDate).toEqual(jan(16)); // duration (2) preserved
  });

  describe("SS dependency", () => {
    const dependencies: TaskDependency[] = [
      { from: 11, to: 12, type: "SS" }, // Install Apache → Run tests
    ];
    const graph = buildDependencyGraph(dependencies);

    const baseTasks = (): GanttTask[] => [
      {
        id: 11,
        name: "Install Apache",
        startDate: jan(10),
        endDate: jan(11),
        progress: 50,
      },
      {
        id: 12,
        name: "Configure firewall",
        startDate: jan(10),
        endDate: jan(12),
        progress: 50,
      },
    ];

    it("does not pull a successor earlier when its predecessor moves earlier", () => {
      const current = toMap(baseTasks());
      move(current, 11, jan(5), jan(6)); // predecessor moves earlier

      const changed = scheduleDependents(current, graph, 11);

      expect(changed.size).toBe(0);
      expect(current.get(12)?.startDate).toEqual(jan(10)); // untouched
    });

    it("does not push a successor later when its predecessor moves later but still satisfies the dependency", () => {
      const current = toMap(baseTasks());
      move(current, 12, jan(20), jan(22)); // successor sits later (has slack)
      move(current, 11, jan(15), jan(16)); // predecessor moves later, but before the successor

      const changed = scheduleDependents(current, graph, 11);

      expect(changed.size).toBe(0);
      expect(current.get(12)?.startDate).toEqual(jan(20)); // untouched
    });

    it("pushes a successor later when its predecessor moves later the start of the successor task", () => {
      const current = toMap(baseTasks());
      move(current, 11, jan(20), jan(21)); // predecessor moves past the successor's start

      const changed = scheduleDependents(current, graph, 11);

      expect(changed.get(12)?.startDate).toEqual(jan(20)); // SS → aligns to predecessor start
      expect(changed.get(12)?.endDate).toEqual(jan(22)); // duration (1) preserved
    });

    it("push successor to start of predecessor when successor starts moves before predecessor", () => {
      const current = toMap(baseTasks());
      move(current, 12, jan(5), jan(7)); // successor dragged before its predecessor

      const changed = scheduleDependents(current, graph, 12);

      expect(changed.get(12)?.startDate).toEqual(jan(10)); // clamped onto predecessor start
      expect(changed.get(12)?.endDate).toEqual(jan(12)); // duration (1) preserved
    });
  });

  describe("SF dependency", () => {
    const dependencies: TaskDependency[] = [
      { from: 11, to: 12, type: "SF" }, // Install Apache → Configure firewall
    ];
    const graph = buildDependencyGraph(dependencies);

    const baseTasks = (): GanttTask[] => [
      {
        id: 11,
        name: "Install Apache",
        startDate: jan(10),
        endDate: jan(11),
        progress: 50,
      },
      {
        id: 12,
        name: "Configure firewall",
        startDate: jan(10),
        endDate: jan(12),
        progress: 50,
      },
    ];

    it("finishes the successor the day before the predecessor starts, with no lag, when the predecessor is after it", () => {
      const current = toMap(baseTasks());
      move(current, 11, jan(20), jan(21)); // predecessor moves well after the successor

      const changed = scheduleDependents(current, graph, 11);

      // SF → successor finishes adjacent to (the day before) the predecessor's start
      expect(changed.get(12)?.endDate).toEqual(jan(20));
      expect(changed.get(12)?.startDate).toEqual(jan(18)); // duration (1) preserved
    });

    it("does not pull a successor earlier when its predecessor moves earlier", () => {
      const current = toMap(baseTasks());
      move(current, 11, jan(5), jan(6)); // predecessor moves earlier

      const changed = scheduleDependents(current, graph, 11);

      expect(changed.size).toBe(0);
      expect(current.get(12)?.startDate).toEqual(jan(10)); // untouched
    });

    it("clamps a successor dragged before its anchor onto the predecessor's start", () => {
      const current = toMap(baseTasks());
      move(current, 12, jan(2), jan(4)); // successor dragged earlier than its anchor

      const changed = scheduleDependents(current, graph, 12);

      expect(changed.get(12)?.endDate).toEqual(jan(10)); // day before the predecessor's start
      expect(changed.get(12)?.startDate).toEqual(jan(8)); // duration (1) preserved
    });
  });

  describe("FS dependency", () => {
    const dependencies: TaskDependency[] = [
      { from: 11, to: 12, type: "FS" }, // Install Apache → Configure firewall
    ];
    const graph = buildDependencyGraph(dependencies);

    const baseTasks = (): GanttTask[] => [
      {
        id: 11,
        name: "Install Apache",
        startDate: jan(10),
        endDate: jan(11),
        progress: 50,
      },
      {
        id: 12,
        name: "Configure firewall",
        startDate: jan(10),
        endDate: jan(12),
        progress: 50,
      },
    ];

    it("pushes a successor to the day after the predecessor finishes later", () => {
      const current = toMap(baseTasks());
      move(current, 11, jan(18), jan(21)); // predecessor finishes later

      const changed = scheduleDependents(current, graph, 11);

      expect(changed.get(12)?.startDate).toEqual(jan(21)); // day after the finish
      expect(changed.get(12)?.endDate).toEqual(jan(23)); // duration (1) preserved
    });

    it("does not pull a successor earlier when its predecessor moves earlier", () => {
      const current = toMap(baseTasks());
      move(current, 11, jan(5), jan(6)); // predecessor moves earlier

      const changed = scheduleDependents(current, graph, 11);

      expect(changed.size).toBe(0);
      expect(current.get(12)?.startDate).toEqual(jan(10)); // untouched
    });

    it("does not push a successor later when its predecessor moves later but still satisfies the dependency", () => {
      const current = toMap(baseTasks());
      move(current, 12, jan(25), jan(27)); // successor sits later (has slack)
      move(current, 11, jan(15), jan(16)); // predecessor finishes later, but before the successor

      const changed = scheduleDependents(current, graph, 11);

      expect(changed.size).toBe(0);
      expect(current.get(12)?.startDate).toEqual(jan(25)); // untouched
    });

    it("clamps a successor dragged before the predecessor finishes onto the day after", () => {
      const current = toMap(baseTasks());
      move(current, 12, jan(2), jan(4)); // successor dragged before the predecessor finishes

      const changed = scheduleDependents(current, graph, 12);

      expect(changed.get(12)?.startDate).toEqual(jan(11)); // day after the predecessor's finish
      expect(changed.get(12)?.endDate).toEqual(jan(13)); // duration (1) preserved
    });
  });

  describe("FF dependency", () => {
    const dependencies: TaskDependency[] = [
      { from: 11, to: 12, type: "FF" }, // Install Apache → Configure firewall
    ];
    const graph = buildDependencyGraph(dependencies);

    const baseTasks = (): GanttTask[] => [
      {
        id: 11,
        name: "Install Apache",
        startDate: jan(10),
        endDate: jan(11),
        progress: 50,
      },
      {
        id: 12,
        name: "Configure firewall",
        startDate: jan(10),
        endDate: jan(12),
        progress: 50,
      },
    ];

    it("aligns the successor's finish with the predecessor's when it finishes later", () => {
      const current = toMap(baseTasks());
      move(current, 11, jan(18), jan(21)); // predecessor finishes later

      const changed = scheduleDependents(current, graph, 11);

      expect(changed.get(12)?.endDate).toEqual(jan(21)); // finishes with the predecessor
      expect(changed.get(12)?.startDate).toEqual(jan(19)); // duration (1) preserved
    });

    it("does not pull a successor earlier when its predecessor moves earlier", () => {
      const current = toMap(baseTasks());
      move(current, 11, jan(5), jan(6)); // predecessor finishes earlier

      const changed = scheduleDependents(current, graph, 11);

      expect(changed.size).toBe(0);
      expect(current.get(12)?.startDate).toEqual(jan(10)); // untouched
    });

    it("does not push a successor later when its predecessor finishes later but still satisfies the dependency", () => {
      const current = toMap(baseTasks());
      move(current, 12, jan(25), jan(27)); // successor sits later (has slack)
      move(current, 11, jan(15), jan(16)); // predecessor finishes later, but before the successor

      const changed = scheduleDependents(current, graph, 11);

      expect(changed.size).toBe(0);
      expect(current.get(12)?.startDate).toEqual(jan(25)); // untouched
    });

    it("clamps a successor dragged to finish before the predecessor onto its finish", () => {
      const current = toMap(baseTasks());
      move(current, 12, jan(2), jan(4)); // successor dragged to finish before the predecessor

      const changed = scheduleDependents(current, graph, 12);

      expect(changed.get(12)?.endDate).toEqual(jan(11)); // finishes with the predecessor
      expect(changed.get(12)?.startDate).toEqual(jan(9)); // duration (1) preserved
    });
  });
});
