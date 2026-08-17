import type { ChangeLog, GanttTask, Id, TaskCommand } from "../types";
import { LRUCache } from "./lruCache";
import { endInstantOf, LINEAR_CONTEXT, type SchedulingContext } from "./taskDates";

type TaskRecordsByParentId = Map<Id | null, GanttTask[]>;

/**
 * The resolved task state is a single insertion-ordered Map: the Map IS the
 * display order. `set` on an existing key keeps its position (updates),
 * `delete` is O(1) and order-preserving, so only positional creates need a
 * one-pass rebuild — no parallel `order` array with indexOf/splice.
 */
export type ResolvedTaskMap = Map<Id, GanttTask>;

/**
 * Group an already-resolved, ordered task map into the flattened display list
 * (parents rolled up from their children). Takes the resolved map rather than
 * `(tasks, log)` so callers that already hold the resolved state don't pay for
 * a second replay.
 */
export function getTaskList(
  resolvedById: ResolvedTaskMap,
  ctx: SchedulingContext = LINEAR_CONTEXT,
): GanttTask[] {
  const taskByParentId = groupTaskByParentId(resolvedById.values());
  const roots = taskByParentId.get(null) ?? [];
  const flattened: GanttTask[] = [];
  for (const root of roots) {
    appendSubtree(root, taskByParentId, flattened, ctx);
  }
  return flattened;
}

/** Seed resolved state from the tasks prop: id → task, in display order. */
export function seedResolvedTasks(tasks: GanttTask[]): ResolvedTaskMap {
  const byId: ResolvedTaskMap = new Map();
  for (const task of tasks) {
    byId.set(task.id, task);
  }
  return byId;
}

/**
 * Replay the applied slice of the change log (`transactions[0..cursor]`) over
 * the seed tasks, returning the effective tasks keyed by id in display order.
 * Pure full replay — prefer `resolveCommittedTasksCached` in render paths.
 */
export function resolveCommittedTasks(
  tasks: GanttTask[],
  log: ChangeLog,
): ResolvedTaskMap {
  let resolved = seedResolvedTasks(tasks);
  for (let k = 0; k < log.cursor; k++) {
    resolved = applyCommands(resolved, log.transactions[k]!);
  }
  return resolved;
}

/**
 * Apply one transaction immutably: returns a new map, structurally sharing
 * every untouched task. O(n) for the clone plus O(1) per update/delete.
 */
export function applyTransaction(
  resolved: ResolvedTaskMap,
  commands: TaskCommand[],
): ResolvedTaskMap {
  return applyCommands(new Map(resolved), commands);
}

/**
 * Apply commands to a map the caller owns. Mutates `map` where possible and
 * returns the map to use afterwards (positional creates rebuild).
 */
function applyCommands(map: ResolvedTaskMap, commands: TaskCommand[]): ResolvedTaskMap {
  for (const cmd of commands) {
    switch (cmd.type) {
      case "update":
        // set() on an existing key keeps its insertion position.
        if (map.has(cmd.task.id)) {
          map.set(cmd.task.id, cmd.task);
        }
        break;
      case "delete":
        map.delete(cmd.id);
        break;
      case "create":
        map = insertTask(map, cmd.task, cmd.afterId);
        break;
    }
  }
  return map;
}

/**
 * Insert `task` after `afterId`. Matches the historical replay semantics:
 * `afterId == null` appends; a given-but-missing `afterId` prepends.
 */
function insertTask(
  map: ResolvedTaskMap,
  task: GanttTask,
  afterId: Id | null | undefined,
): ResolvedTaskMap {
  if (afterId == null) {
    map.set(task.id, task);
    return map;
  }
  const next: ResolvedTaskMap = new Map();
  if (!map.has(afterId)) {
    next.set(task.id, task);
  }
  for (const [id, existing] of map) {
    next.set(id, existing);
    if (id === afterId) {
      next.set(task.id, task);
    }
  }
  return next;
}

// --- Cached incremental resolution -----------------------------------------

interface ResolveSnapshot {
  /** The transaction whose application produced this snapshot; null = seed. */
  producedBy: TaskCommand[] | null;
  map: ResolvedTaskMap;
}

/**
 * Snapshots of the resolved state keyed by cursor position. A transaction
 * array element is created exactly once at one log position with one fixed
 * prefix (appends preserve the kept prefix; dropped redo branches never
 * return), so `producedBy === log.transactions[k - 1]` proves the whole
 * prefix matches and the snapshot at `k` is valid.
 */
export interface ResolveCache {
  seedTasks: GanttTask[] | null;
  snapshots: LRUCache<number, ResolveSnapshot>;
}

const RESOLVE_SNAPSHOT_CAPACITY = 32;

export function createResolveCache(): ResolveCache {
  return { seedTasks: null, snapshots: new LRUCache(RESOLVE_SNAPSHOT_CAPACITY) };
}

/**
 * Like `resolveCommittedTasks`, but incremental: reuses the deepest valid
 * snapshot at or below the cursor and only applies the transactions past it.
 * A new edit costs one O(n) clone instead of a full log replay; undo/redo to
 * a recently seen cursor returns the cached map with no work at all.
 */
export function resolveCommittedTasksCached(
  cache: ResolveCache,
  tasks: GanttTask[],
  log: ChangeLog,
): ResolvedTaskMap {
  if (cache.seedTasks !== tasks) {
    cache.seedTasks = tasks;
    cache.snapshots = new LRUCache(RESOLVE_SNAPSHOT_CAPACITY);
  }

  let base = 0;
  let resolved: ResolvedTaskMap | null = null;
  for (let k = log.cursor; k >= 1; k--) {
    const snapshot = cache.snapshots.get(k);
    if (snapshot && snapshot.producedBy === log.transactions[k - 1]) {
      base = k;
      resolved = snapshot.map;
      break;
    }
  }
  if (!resolved) {
    const seed = cache.snapshots.get(0);
    resolved = seed ? seed.map : seedResolvedTasks(tasks);
    if (!seed) {
      cache.snapshots.put(0, { producedBy: null, map: resolved });
    }
  }

  for (let k = base; k < log.cursor; k++) {
    const transaction = log.transactions[k]!;
    resolved = applyTransaction(resolved, transaction);
    cache.snapshots.put(k + 1, { producedBy: transaction, map: resolved });
  }
  return resolved;
}

// --- Tree flattening --------------------------------------------------------

/**
 * Emit `task`'s subtree depth-first into `out` and return the task's
 * effective (rolled-up) version. The parent is emitted as a placeholder
 * before its children, then patched in place once their roll-up is known —
 * one shared output array, no per-level flatMap/concat copying.
 */
function appendSubtree(
  task: GanttTask,
  taskByParentId: TaskRecordsByParentId,
  out: GanttTask[],
  ctx: SchedulingContext,
): GanttTask {
  const children = taskByParentId.get(task.id);
  if (!children || children.length === 0) {
    const leaf = materializeEnd(task, ctx);
    out.push(leaf);
    return leaf;
  }

  const slot = out.length;
  out.push(task);
  const effectiveChildren: GanttTask[] = [];
  for (const child of children) {
    effectiveChildren.push(appendSubtree(child, taskByParentId, out, ctx));
  }
  const effective = getParentTaskData(task, effectiveChildren, ctx);
  out[slot] = effective;
  return effective;
}

/**
 * Give every task in the display list a concrete exclusive `endDate` (ADR-019).
 *
 * This is where the calendar is applied, once. Downstream — `computeTaskPixels`,
 * the dependency-link geometry, `getMinMaxDates`, zoom, `buildDatesFromTasks` —
 * reads plain dates and needs no calendar awareness at all.
 *
 * Identity is preserved when nothing changes, so an already-dated task is not
 * re-allocated on every render.
 */
function materializeEnd(task: GanttTask, ctx: SchedulingContext): GanttTask {
  const end = endInstantOf(task, ctx);
  if (task.endDate && task.endDate.getTime() === end.getTime()) {
    return task;
  }
  if (!task.endDate && end === task.startDate) {
    return task;
  }
  return { ...task, endDate: end };
}

export function getParentTaskData(
  task: GanttTask,
  children: GanttTask[],
  ctx: SchedulingContext = LINEAR_CONTEXT,
): GanttTask {
  // Only summary tasks roll their children's dates/progress up. A parent typed
  // "task" or "milestone" (or untyped) keeps its own data and renders as a
  // regular bar, even when it has children.
  if (task.type !== "summary" || children.length === 0) {
    return materializeEnd(task, ctx);
  }

  let startDate = children[0]!.startDate;
  let endDate = endInstantOf(children[0]!, ctx);
  let progressSum = 0;
  let notMilestoneCount = 0;

  for (const child of children) {
    if (child.startDate < startDate) {
      startDate = child.startDate;
    }

    // Resolve every child, not just those carrying an explicit endDate: a
    // `{ startDate, duration }` child used to contribute only its start, so the
    // parent silently under-reported its own span.
    const childEnd = endInstantOf(child, ctx);
    if (childEnd > endDate) {
      endDate = childEnd;
    }

    // Milestones are moments, not work: they contribute neither progress nor
    // weight to the roll-up. A non-milestone child without progress still
    // counts as 0% so unstarted work drags the average down.
    if (child.type !== "milestone") {
      notMilestoneCount++;
      progressSum += child.progress ?? 0;
    }
  }

  const progress =
    notMilestoneCount === 0 ? 0 : Math.round(progressSum / notMilestoneCount);

  // Identity is preserved when the roll-up lands on what the task already says,
  // exactly as `materializeEnd` does for leaves. Without this every summary row
  // and bar got a fresh object on every edit and re-rendered, even for an edit
  // in a different branch of the tree.
  if (
    task.startDate.getTime() === startDate.getTime() &&
    task.endDate?.getTime() === endDate.getTime() &&
    task.progress === progress
  ) {
    return task;
  }

  return {
    ...task,
    startDate,
    endDate,
    progress,
  };
}

function groupTaskByParentId(tasks: Iterable<GanttTask>): TaskRecordsByParentId {
  const acc: TaskRecordsByParentId = new Map();
  for (const task of tasks) {
    const parentId = task.parentId ?? null;
    const siblings = acc.get(parentId) ?? [];
    siblings.push(task);
    acc.set(parentId, siblings);
  }
  return acc;
}
