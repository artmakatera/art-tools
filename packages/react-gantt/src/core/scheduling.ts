import type { GanttTask, Id, TaskDependency, TaskDependencyType } from "../types";
import { addDays, diffDays, getEndDate } from "./dateUtils";
import { Queue } from "./queue";

interface Span {
  start: Date;
  /** Last occupied day (inclusive); equals `start` for milestones. */
  end: Date;
}

function spanOf(task: GanttTask): Span {
  return {
    start: task.startDate,
    end: getEndDate(task.startDate, task.endDate, task.duration),
  };
}

/** Whole-day span of a task, inclusive (a 1-day task has duration 0). */
function durationDaysOf(task: GanttTask): number {
  const { start, end } = spanOf(task);
  return diffDays(start, end);
}

/**
 * Earliest start a successor may take given a single predecessor and the
 * relationship type, using ASAP forward-scheduling rules. The task model
 * treats `endDate` as the last occupied day (inclusive), so a finish-to-start
 * link places the successor on the day *after* the finish.
 */
function constrainedStart(
  pred: Span,
  type: TaskDependencyType,
  lag: number,
  successorDuration: number,
): Date {
  switch (type) {
    case "FS": // successor starts the day after the predecessor finishes
      return addDays(pred.end, 1 + lag);
    case "SS": // successor starts together with the predecessor
      return addDays(pred.start, lag);
    case "FF": // successor finishes together with the predecessor
      return addDays(pred.end, lag - successorDuration);
    case "SF": // successor finishes the day before the predecessor starts
      return addDays(pred.start, -1 + lag - successorDuration);
  }
}

/**
 * Adjacency index over the dependency list, built once and reused across
 * commits (memoize on the dependency array). Both lookups are by task id so the
 * forward walk stays O(1) per edge.
 */
export interface DependencyGraph {
  /** predecessor id → ids of its direct successors (traversal order) */
  successorsOf: Map<Id, Id[]>;
  /** successor id → the dependencies that constrain it (constraint inputs) */
  predecessorDeps: Map<Id, TaskDependency[]>;
  /** number of dependency edges (used to bound the relaxation loop) */
  size: number;
}

export function buildDependencyGraph(
  dependencies: TaskDependency[],
): DependencyGraph {
  const successorsOf = new Map<Id, Id[]>();
  const predecessorDeps = new Map<Id, TaskDependency[]>();
  for (const dep of dependencies) {
    const successorList = successorsOf.get(dep.from);
    if (successorList) successorList.push(dep.to);
    else successorsOf.set(dep.from, [dep.to]);

    const deps = predecessorDeps.get(dep.to);
    if (deps) deps.push(dep);
    else predecessorDeps.set(dep.to, [dep]);
  }
  return { successorsOf, predecessorDeps, size: dependencies.length };
}

/**
 * Re-schedule the dependents of a changed task.
 *
 * Walks the dependency graph forward from `changedId`: each successor is moved
 * (its duration preserved) so that its binding edge satisfies *all* of its
 * predecessors — taking the latest constraint when several apply — then its own
 * successors are revisited. Returns only the tasks whose dates moved.
 *
 * `current` is the working set of effective tasks and is mutated in place as
 * the schedule settles. A per-call iteration cap keeps dependency cycles from
 * looping forever.
 */
export function scheduleDependents(
  current: Map<Id, GanttTask>,
  graph: DependencyGraph,
  changedId: Id,
): Map<Id, GanttTask> {
  const { successorsOf, predecessorDeps } = graph;

  const changed = new Map<Id, GanttTask>();
  const queue = new Queue<Id>([changedId]);
  const maxIterations = (graph.size + 1) * (current.size + 1);
  let iterations = 0;

  while (!queue.isEmpty()) {
    if (iterations++ > maxIterations) break; // guard against dependency cycles
    const predId = queue.dequeue()!;

    for (const successorId of successorsOf.get(predId) ?? []) {
      const successor = current.get(successorId);
      if (!successor) continue;

      const duration = durationDaysOf(successor);
      let earliest: Date | null = null;
      for (const dep of predecessorDeps.get(successorId) ?? []) {
        const pred = current.get(dep.from);
        if (!pred) continue;
        const candidate = constrainedStart(
          spanOf(pred),
          dep.type,
          dep.lag ?? 0,
          duration,
        );
        if (earliest === null || candidate > earliest) earliest = candidate;
      }

      if (earliest === null) continue;
      if (diffDays(successor.startDate, earliest) === 0) continue; // unchanged

      const next: GanttTask = {
        ...successor,
        startDate: earliest,
        endDate:
          successor.type === "milestone"
            ? successor.endDate
            : addDays(earliest, duration),
      };
      current.set(successorId, next);
      changed.set(successorId, next);
      queue.enqueue(successorId);
    }
  }

  return changed;
}
