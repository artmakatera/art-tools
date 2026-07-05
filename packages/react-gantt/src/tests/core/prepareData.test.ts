import { describe, expect, it } from "vitest";
import {
  createResolveCache,
  getTaskList,
  resolveCommittedTasks,
  resolveCommittedTasksCached,
} from "../../core/prepareData";
import type { ChangeLog, GanttTask, TaskCommand } from "../../types";

function task(id: string, overrides: Partial<GanttTask> = {}): GanttTask {
  return {
    id,
    name: `Task ${id}`,
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-01-10"),
    ...overrides,
  };
}

const seed = [task("1"), task("2"), task("3")];

function log(transactions: TaskCommand[][], cursor = transactions.length): ChangeLog {
  return { transactions, cursor };
}

describe("resolveCommittedTasks", () => {
  it("returns the seed in order with an empty log", () => {
    const resolved = resolveCommittedTasks(seed, log([]));
    expect([...resolved.keys()]).toEqual(["1", "2", "3"]);
  });

  it("applies updates in place, preserving position", () => {
    const renamed = task("2", { name: "Renamed" });
    const resolved = resolveCommittedTasks(seed, log([[{ type: "update", task: renamed }]]));
    expect([...resolved.keys()]).toEqual(["1", "2", "3"]);
    expect(resolved.get("2")?.name).toBe("Renamed");
  });

  it("ignores updates for unknown ids", () => {
    const ghost = task("99");
    const resolved = resolveCommittedTasks(seed, log([[{ type: "update", task: ghost }]]));
    expect(resolved.has("99")).toBe(false);
  });

  it("inserts created tasks after afterId", () => {
    const created = task("4");
    const resolved = resolveCommittedTasks(
      seed,
      log([[{ type: "create", task: created, afterId: "1" }]]),
    );
    expect([...resolved.keys()]).toEqual(["1", "4", "2", "3"]);
  });

  it("appends created tasks when afterId is null", () => {
    const created = task("4");
    const resolved = resolveCommittedTasks(
      seed,
      log([[{ type: "create", task: created, afterId: null }]]),
    );
    expect([...resolved.keys()]).toEqual(["1", "2", "3", "4"]);
  });

  it("prepends created tasks when afterId is missing (historical semantics)", () => {
    const created = task("4");
    const resolved = resolveCommittedTasks(
      seed,
      log([[{ type: "create", task: created, afterId: "nope" }]]),
    );
    expect([...resolved.keys()]).toEqual(["4", "1", "2", "3"]);
  });

  it("deletes tasks preserving the order of the rest", () => {
    const resolved = resolveCommittedTasks(seed, log([[{ type: "delete", id: "2" }]]));
    expect([...resolved.keys()]).toEqual(["1", "3"]);
  });

  it("only replays transactions before the cursor", () => {
    const renamed = task("1", { name: "Renamed" });
    const resolved = resolveCommittedTasks(
      seed,
      log([[{ type: "update", task: renamed }]], 0),
    );
    expect(resolved.get("1")?.name).toBe("Task 1");
  });
});

describe("resolveCommittedTasksCached", () => {
  it("matches the pure resolver across appends, undo, and redo", () => {
    const cache = createResolveCache();
    const t1: TaskCommand[] = [{ type: "update", task: task("1", { name: "A" }) }];
    const t2: TaskCommand[] = [{ type: "create", task: task("4"), afterId: "2" }];
    const t3: TaskCommand[] = [{ type: "delete", id: "3" }];
    const transactions = [t1, t2, t3];

    // Simulate the hook's usage: append, append, append, undo, undo, redo.
    const cursors = [0, 1, 2, 3, 2, 1, 2];
    for (const cursor of cursors) {
      const l = log(transactions, cursor);
      const cached = resolveCommittedTasksCached(cache, seed, l);
      const pure = resolveCommittedTasks(seed, l);
      expect([...cached.entries()]).toEqual([...pure.entries()]);
    }
  });

  it("reuses the cached map instance on undo to a recent cursor", () => {
    const cache = createResolveCache();
    const t1: TaskCommand[] = [{ type: "update", task: task("1", { name: "A" }) }];
    const t2: TaskCommand[] = [{ type: "update", task: task("2", { name: "B" }) }];
    const transactions = [t1, t2];

    const atOne = resolveCommittedTasksCached(cache, seed, log(transactions, 1));
    resolveCommittedTasksCached(cache, seed, log(transactions, 2));
    const undone = resolveCommittedTasksCached(cache, seed, log(transactions, 1));
    expect(undone).toBe(atOne);
  });

  it("does not reuse snapshots from a dropped redo branch", () => {
    const cache = createResolveCache();
    const t1: TaskCommand[] = [{ type: "update", task: task("1", { name: "A" }) }];
    const oldBranch: TaskCommand[] = [{ type: "update", task: task("2", { name: "old" }) }];
    const newBranch: TaskCommand[] = [{ type: "update", task: task("2", { name: "new" }) }];

    resolveCommittedTasksCached(cache, seed, log([t1, oldBranch], 2));
    // Undo, then a fresh edit replaces the redo branch at the same cursor.
    resolveCommittedTasksCached(cache, seed, log([t1, oldBranch], 1));
    const resolved = resolveCommittedTasksCached(cache, seed, log([t1, newBranch], 2));
    expect(resolved.get("2")?.name).toBe("new");
  });

  it("resets when the seed tasks identity changes", () => {
    const cache = createResolveCache();
    const t1: TaskCommand[] = [{ type: "update", task: task("1", { name: "A" }) }];
    resolveCommittedTasksCached(cache, seed, log([t1], 1));

    const newSeed = [task("1", { name: "Fresh" })];
    const resolved = resolveCommittedTasksCached(cache, newSeed, log([], 0));
    expect([...resolved.keys()]).toEqual(["1"]);
    expect(resolved.get("1")?.name).toBe("Fresh");
  });
});

describe("getTaskList", () => {
  it("flattens depth-first with parents before children", () => {
    const resolved = resolveCommittedTasks(
      [
        task("p"),
        task("c1", { parentId: "p" }),
        task("gc", { parentId: "c1" }),
        task("c2", { parentId: "p" }),
        task("root2"),
      ],
      log([]),
    );
    expect(getTaskList(resolved).map((t) => t.id)).toEqual(["p", "c1", "gc", "c2", "root2"]);
  });

  it("rolls parent dates and progress up from children", () => {
    const resolved = resolveCommittedTasks(
      [
        task("p", { type: "summary", startDate: new Date("2026-06-01"), endDate: new Date("2026-06-02"), progress: 0 }),
        task("c1", {
          parentId: "p",
          startDate: new Date("2026-01-05"),
          endDate: new Date("2026-01-10"),
          progress: 40,
        }),
        task("c2", {
          parentId: "p",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-01-20"),
          progress: 80,
        }),
      ],
      log([]),
    );
    const [parent] = getTaskList(resolved);
    expect(parent!.startDate).toEqual(new Date("2026-01-01"));
    expect(parent!.endDate).toEqual(new Date("2026-01-20"));
    expect(parent!.progress).toBe(60);
  });

  it("excludes milestone progress from the parent roll-up", () => {
    const resolved = resolveCommittedTasks(
      [
        task("p", { type: "summary" }),
        task("c1", { parentId: "p", progress: 90 }),
        task("c2", { parentId: "p", progress: 94 }),
        task("m", { parentId: "p", type: "milestone", progress: 100 }),
      ],
      log([]),
    );
    const [parent] = getTaskList(resolved);
    // Previously (90 + 94 + 100) / 2 = 142%: milestones inflated the sum
    // while being excluded from the count.
    expect(parent!.progress).toBe(92);
  });

  it("treats children without progress as 0% in the roll-up", () => {
    const resolved = resolveCommittedTasks(
      [
        task("p", { type: "summary" }),
        task("c1", { parentId: "p", progress: 50 }),
        task("c2", { parentId: "p" }),
      ],
      log([]),
    );
    const [parent] = getTaskList(resolved);
    expect(parent!.progress).toBe(25);
  });

  it("reports 0% for a parent whose children are all milestones", () => {
    const resolved = resolveCommittedTasks(
      [
        task("p", { type: "summary" }),
        task("m1", { parentId: "p", type: "milestone", progress: 100 }),
        task("m2", { parentId: "p", type: "milestone" }),
      ],
      log([]),
    );
    const [parent] = getTaskList(resolved);
    // Previously progressSum / 0 = Infinity.
    expect(parent!.progress).toBe(0);
  });

  it("does NOT roll up a parent typed \"task\" — it keeps its own data", () => {
    const resolved = resolveCommittedTasks(
      [
        task("p", {
          type: "task",
          startDate: new Date("2026-06-01"),
          endDate: new Date("2026-06-02"),
          progress: 5,
        }),
        task("c1", {
          parentId: "p",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-01-20"),
          progress: 80,
        }),
      ],
      log([]),
    );
    const [parent, child] = getTaskList(resolved);
    // Parent keeps its own dates/progress; children are still emitted below it.
    expect(parent!.startDate).toEqual(new Date("2026-06-01"));
    expect(parent!.endDate).toEqual(new Date("2026-06-02"));
    expect(parent!.progress).toBe(5);
    expect(child!.id).toBe("c1");
  });

  it("does NOT roll up an untyped parent — only \"summary\" rolls up", () => {
    const resolved = resolveCommittedTasks(
      [
        task("p", { startDate: new Date("2026-06-01"), endDate: new Date("2026-06-02"), progress: 5 }),
        task("c1", {
          parentId: "p",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-01-20"),
          progress: 80,
        }),
      ],
      log([]),
    );
    const [parent] = getTaskList(resolved);
    expect(parent!.startDate).toEqual(new Date("2026-06-01"));
    expect(parent!.progress).toBe(5);
  });

  it("rolls a summary up from a regular-task child's OWN dates, not its subtree", () => {
    // Summary s → task-parent t (own dates Jan 1–5) → leaf l (extends to Jan 20).
    // t is a regular task, so its effective span is its own; s rolls up t's own.
    const resolved = resolveCommittedTasks(
      [
        task("s", { type: "summary", startDate: new Date("2026-06-01"), endDate: new Date("2026-06-02") }),
        task("t", {
          parentId: "s",
          type: "task",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-01-05"),
        }),
        task("l", {
          parentId: "t",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-01-20"),
        }),
      ],
      log([]),
    );
    const [summary] = getTaskList(resolved);
    expect(summary!.startDate).toEqual(new Date("2026-01-01"));
    expect(summary!.endDate).toEqual(new Date("2026-01-05")); // t's own end, not l's Jan 20
  });
});
