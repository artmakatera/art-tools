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
 * Earliest start `task` may take so that *every* incoming dependency is
 * satisfied — the latest constraint across all predecessors, or `null` when the
 * task has none.
 */
function earliestStart(
  task: GanttTask,
  predecessorDeps: Map<Id, TaskDependency[]>,
  current: Map<Id, GanttTask>,
): Date | null {
  const duration = durationDaysOf(task);
  let earliest: Date | null = null;
  for (const dep of predecessorDeps.get(task.id) ?? []) {
    const pred = current.get(dep.from);
    if (!pred) continue;
    const candidate = constrainedStart(spanOf(pred), dep.type, dep.lag ?? 0, duration);
    if (earliest === null || candidate > earliest) earliest = candidate;
  }
  return earliest;
}

/** A copy of `task` moved to `start`, preserving its duration. */
function movedTo(task: GanttTask, start: Date): GanttTask {
  return {
    ...task,
    startDate: start,
    endDate:
      task.type === "milestone"
        ? task.endDate
        : addDays(start, durationDaysOf(task)),
  };
}

/**
 * Re-schedule the dependents of a changed task.
 *
 * First clamps the changed task itself forward if the user moved it so that it
 * violates one of its own predecessors — e.g. dragging a start-to-start
 * successor before its predecessor snaps its start back onto the predecessor's
 * (a valid earlier/later move is left untouched).
 *
 * Then walks the dependency graph forward from `changedId`. Dependencies act as
 * a lower bound: a successor is pushed later only when a move would violate it
 * (taking the latest constraint when several predecessors apply), and is never
 * pulled earlier when a predecessor moves back. Its duration is preserved and
 * its own successors are then revisited. Returns only the tasks whose dates
 * moved.
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

  // Clamp the dragged task forward to satisfy its own predecessors before
  // cascading. Only a violating (too-early) move is corrected; the constraint
  // is a lower bound, so a valid drag is preserved.
  const changedTask = current.get(changedId);
  if (changedTask) {
    const earliest = earliestStart(changedTask, predecessorDeps, current);
    if (earliest !== null && diffDays(changedTask.startDate, earliest) > 0) {
      const clamped = movedTo(changedTask, earliest);
      current.set(changedId, clamped);
      changed.set(changedId, clamped);
    }
  }

  const queue = new Queue<Id>([changedId]);
  const maxIterations = (graph.size + 1) * (current.size + 1);
  let iterations = 0;

  while (!queue.isEmpty()) {
    if (iterations++ > maxIterations) break; // guard against dependency cycles
    const predId = queue.dequeue()!;

    for (const successorId of successorsOf.get(predId) ?? []) {
      const successor = current.get(successorId);
      if (!successor) continue;

      const earliest = earliestStart(successor, predecessorDeps, current);
      if (earliest === null) continue;
      // Lower bound only: push a violating (too-early) successor forward, but
      // never pull it earlier when a predecessor moves back.
      if (diffDays(successor.startDate, earliest) <= 0) continue;

      const next = movedTo(successor, earliest);
      current.set(successorId, next);
      changed.set(successorId, next);
      queue.enqueue(successorId);
    }
  }

  return changed;
}
