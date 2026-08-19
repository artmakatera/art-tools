import { describe, expect, it } from "vitest";
import {
  computeLinkGeometry,
  reRouteOverrides,
} from "../../../components/dependency-links/geometry";
import type { GanttTask, TaskDependency, TaskState } from "../../../types";

/**
 * The drag path re-routes incrementally (only the links touching an overridden
 * task) instead of re-deriving every link. These tests pin the invariant that
 * makes that safe: the incremental result must equal a full pass over tasks that
 * really carry the override's dates.
 */

const PARAMS = {
  origin: new Date(2024, 0, 1),
  colWidth: 30,
  rowHeight: 32,
  unit: "day" as const,
};

function task(
  id: string | number,
  start: number,
  end: number,
  extra: Partial<GanttTask> = {},
): GanttTask {
  return {
    id,
    name: `task ${id}`,
    startDate: new Date(2024, 0, start),
    endDate: new Date(2024, 0, end),
    ...extra,
  };
}

/** Apply the override to the task list itself, then run the full base pass. */
function fullPass(
  tasks: GanttTask[],
  dependencies: TaskDependency[],
  overrides: Record<string, Partial<TaskState>>,
) {
  const patched = tasks.map((t) => {
    const override = overrides[String(t.id)];
    return override ? { ...t, ...override } : t;
  });
  return computeLinkGeometry({ tasks: patched, dependencies, ...PARAMS }).links;
}

describe("reRouteOverrides", () => {
  const tasks = [task(1, 1, 4), task(2, 5, 9), task(3, 10, 14), task(4, 15, 18)];
  const dependencies: TaskDependency[] = [
    { from: 1, to: 2, type: "FS" },
    { from: 2, to: 3, type: "SS" },
    { from: 3, to: 4, type: "FF" },
    { from: 1, to: 4, type: "SF" },
  ];

  it("returns the base links untouched when there are no overrides", () => {
    const base = computeLinkGeometry({ tasks, dependencies, ...PARAMS });
    expect(reRouteOverrides(base, {}, PARAMS)).toBe(base.links);
  });

  it("matches a full recompute when a middle task is dragged", () => {
    const overrides = {
      "2": { startDate: new Date(2024, 0, 7), endDate: new Date(2024, 0, 11) },
    };
    const base = computeLinkGeometry({ tasks, dependencies, ...PARAMS });
    expect(reRouteOverrides(base, overrides, PARAMS)).toEqual(
      fullPass(tasks, dependencies, overrides),
    );
  });

  it("matches a full recompute for a task on both ends of different links", () => {
    // Task 1 is the source of an FS link and of an SF link.
    const overrides = {
      "1": { startDate: new Date(2024, 0, 2), endDate: new Date(2024, 0, 6) },
    };
    const base = computeLinkGeometry({ tasks, dependencies, ...PARAMS });
    expect(reRouteOverrides(base, overrides, PARAMS)).toEqual(
      fullPass(tasks, dependencies, overrides),
    );
  });

  it("matches a full recompute when both endpoints of one link are overridden", () => {
    const overrides = {
      "2": { startDate: new Date(2024, 0, 6), endDate: new Date(2024, 0, 10) },
      "3": { startDate: new Date(2024, 0, 12), endDate: new Date(2024, 0, 16) },
    };
    const base = computeLinkGeometry({ tasks, dependencies, ...PARAMS });
    expect(reRouteOverrides(base, overrides, PARAMS)).toEqual(
      fullPass(tasks, dependencies, overrides),
    );
  });

  it("keeps a milestone's diamond geometry when dragged", () => {
    const withMilestone = [task(1, 1, 4), task(2, 5, 5, { type: "milestone" }), task(3, 10, 14)];
    const deps: TaskDependency[] = [
      { from: 1, to: 2, type: "FS" },
      { from: 2, to: 3, type: "FS" },
    ];
    const overrides = {
      "2": { startDate: new Date(2024, 0, 8), endDate: new Date(2024, 0, 8) },
    };
    const base = computeLinkGeometry({
      tasks: withMilestone,
      dependencies: deps,
      ...PARAMS,
    });
    expect(reRouteOverrides(base, overrides, PARAMS)).toEqual(
      fullPass(withMilestone, deps, overrides),
    );
  });

  it("re-uses the identical link objects for untouched links", () => {
    const base = computeLinkGeometry({ tasks, dependencies, ...PARAMS });
    const next = reRouteOverrides(
      base,
      { "3": { startDate: new Date(2024, 0, 11), endDate: new Date(2024, 0, 15) } },
      PARAMS,
    );
    // Link 0 is 1→2, which task 3 does not touch.
    expect(next[0]).toBe(base.links[0]);
    // Links 1 (2→3) and 2 (3→4) both touch it, so they are fresh objects.
    expect(next[1]).not.toBe(base.links[1]);
    expect(next[2]).not.toBe(base.links[2]);
  });

  it("ignores overrides for tasks that carry no dependency", () => {
    const base = computeLinkGeometry({ tasks, dependencies, ...PARAMS });
    const orphan = { "999": { startDate: new Date(2024, 0, 20) } };
    expect(reRouteOverrides(base, orphan, PARAMS)).toBe(base.links);
  });

  it("works with numeric and string ids alike", () => {
    const stringIds = [task("a", 1, 4), task("b", 5, 9)];
    const deps: TaskDependency[] = [{ from: "a", to: "b", type: "FS" }];
    const overrides = {
      a: { startDate: new Date(2024, 0, 3), endDate: new Date(2024, 0, 6) },
    };
    const base = computeLinkGeometry({ tasks: stringIds, dependencies: deps, ...PARAMS });
    expect(reRouteOverrides(base, overrides, PARAMS)).toEqual(fullPass(stringIds, deps, overrides));
  });
});
