import type { GanttTask, Id, TaskDependency, TaskDependencyType } from "../types";
import type { BarCommit } from "./barUtils";
import { Queue } from "./queue";
import { endInstantOf, LINEAR_CONTEXT, type SchedulingContext } from "./taskDates";
import {
  addWorkingMs,
  closestWorkingTime,
  countWorkingMs,
  nearestWorkingTime,
  workingMsPerUnit,
} from "./workingTime";

interface Span {
  start: Date;
  /** The instant work stops — EXCLUSIVE (ADR-014). Equals `start` for milestones. */
  end: Date;
}

function spanOf(task: GanttTask, ctx: SchedulingContext): Span {
  return {
    start: task.startDate,
    end: endInstantOf(task, ctx),
  };
}

/** Working time a task occupies, in milliseconds. */
function workingLengthOf(task: GanttTask, ctx: SchedulingContext): number {
  const { start, end } = spanOf(task, ctx);
  return countWorkingMs(ctx.calendar, start, end);
}

/**
 * Earliest start a successor may take given a single predecessor and the
 * relationship type, using ASAP forward-scheduling rules.
 *
 * `endDate` is an exclusive instant, so a finish-to-start link starts the
 * successor exactly where the predecessor stopped — the `+1`/`-1` day fudges the
 * old inclusive model needed are gone, not ported.
 *
 * FF and SF are **decomposed** into two separately anchored walks rather than
 * folding `lag - successorLength` into one offset (ADR-007). Folding is wrong
 * twice under working time: the two terms are measured from different anchors,
 * and they travel in opposite directions when their signs differ, so working-time
 * addition — which is not linear — cannot combine them.
 *
 * The explicit anchor direction matters most at `lag === 0`, the commonest value:
 * FS/SS compute a *start* and must project forward, while FF/SF compute a
 * *finish* and must project backward. Deriving the direction from the sign of a
 * zero would silently pick the wrong one.
 */
function constrainedStart(
  pred: Span,
  type: TaskDependencyType,
  lagMs: number,
  successorLength: number,
  ctx: SchedulingContext,
): Date {
  const cal = ctx.calendar;
  switch (type) {
    case "FS": // successor starts where the predecessor finished
      return addWorkingMs(cal, pred.end, lagMs, 1);
    case "SS": // successor starts together with the predecessor
      return addWorkingMs(cal, pred.start, lagMs, 1);
    case "FF": {
      // successor finishes together with the predecessor
      const finish = addWorkingMs(cal, pred.end, lagMs, -1);
      return addWorkingMs(cal, finish, -successorLength, -1);
    }
    case "SF": {
      // successor finishes when the predecessor starts
      const finish = addWorkingMs(cal, pred.start, lagMs, -1);
      return addWorkingMs(cal, finish, -successorLength, -1);
    }
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
  ctx: SchedulingContext,
): Date | null {
  const length = workingLengthOf(task, ctx);
  const msPerUnit = workingMsPerUnit(ctx.calendar, ctx.durationUnit);
  let earliest: Date | null = null;
  for (const dep of predecessorDeps.get(task.id) ?? []) {
    const pred = current.get(dep.from);
    if (!pred) continue;
    const candidate = constrainedStart(
      spanOf(pred, ctx),
      dep.type,
      (dep.lag ?? 0) * msPerUnit,
      length,
      ctx,
    );
    if (earliest === null || candidate > earliest) earliest = candidate;
  }
  if (earliest === null) {
    return null;
  }
  // Project once, here, so the value the caller compares against is a fixpoint.
  // `closestWorkingTime` is idempotent, so a task already parked on this instant
  // stops moving; without this the strict comparison below could keep firing and
  // silently exhaust the iteration guard, yielding a wrong-but-stable schedule.
  return closestWorkingTime(ctx.calendar, earliest, 1);
}

/** A copy of `task` moved to `start`, preserving the working time it occupies. */
function movedTo(task: GanttTask, start: Date, ctx: SchedulingContext): GanttTask {
  // A milestone is an instant: its end mirrors its start, never lags behind it.
  // This is the single milestone rule — `useTaskList` defers to it rather than
  // keeping its own.
  if (task.type === "milestone") {
    return { ...task, startDate: start, endDate: start };
  }
  return {
    ...task,
    startDate: start,
    endDate: addWorkingMs(ctx.calendar, start, workingLengthOf(task, ctx), 1),
  };
}

/**
 * Turn a finished drag into the dates to store — the one place a pixel-derived
 * value meets the calendar.
 *
 * A **move** preserves the task's working time, not its pixel width: drag a
 * three-working-day task onto a Thursday and it still occupies three working days,
 * growing visually across the weekend. A **resize** sets the working time instead,
 * so an edge dropped in non-working time settles back onto the nearest working
 * boundary (ADR-005) — quantization, which happens even with `snapToWorking` off.
 *
 * Starts always project forward and ends backward (ADR-020), which is what keeps
 * every library-authored task forward-anchored at its start and backward-anchored
 * at its end — the precondition that makes span round-trips exact.
 */
export function resolveCommit(
  task: GanttTask,
  commit: BarCommit,
  ctx: SchedulingContext,
): { startDate: Date; endDate: Date } {
  const cal = ctx.calendar;
  const snap = ctx.snapToWorking;
  const span = spanOf(task, ctx);

  if (task.type === "milestone") {
    const raw = commit.kind === "resizeEnd" ? commit.endDate : commit.startDate;
    const at = snap ? nearestWorkingTime(cal, raw) : raw;
    return { startDate: at, endDate: at };
  }

  if (commit.kind === "move") {
    const length = countWorkingMs(cal, span.start, span.end);
    const start = snap ? closestWorkingTime(cal, commit.startDate, 1) : commit.startDate;
    return { startDate: start, endDate: addWorkingMs(cal, start, length, 1) };
  }

  // Resize: project both edges inward and clamp to at least some working time.
  // The untouched edge is unchanged pixel-wise, so projecting it is a no-op on an
  // already-valid task — which is also what fixes the old bug where snapping the
  // start handle could shift the far edge by a whole column.
  const rawStart = commit.kind === "resizeStart" ? commit.startDate : span.start;
  const rawEnd = commit.kind === "resizeEnd" ? commit.endDate : span.end;
  const start = snap ? closestWorkingTime(cal, rawStart, 1) : rawStart;
  const end = snap ? closestWorkingTime(cal, rawEnd, -1) : rawEnd;

  if (countWorkingMs(cal, start, end) <= 0) {
    // Collapsed or inverted — keep one unit of working time anchored on the edge
    // the user was NOT dragging.
    const unitMs = workingMsPerUnit(cal, ctx.durationUnit);
    if (commit.kind === "resizeStart") {
      return { startDate: addWorkingMs(cal, end, -unitMs, -1), endDate: end };
    }
    return { startDate: start, endDate: addWorkingMs(cal, start, unitMs, 1) };
  }
  return { startDate: start, endDate: end };
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
  ctx: SchedulingContext = LINEAR_CONTEXT,
): Map<Id, GanttTask> {
  const { successorsOf, predecessorDeps } = graph;

  const changed = new Map<Id, GanttTask>();

  // Clamp the dragged task forward to satisfy its own predecessors before
  // cascading. Only a violating (too-early) move is corrected; the constraint
  // is a lower bound, so a valid drag is preserved.
  const changedTask = current.get(changedId);
  if (changedTask) {
    const earliest = earliestStart(changedTask, predecessorDeps, current, ctx);
    if (earliest !== null && earliest.getTime() > changedTask.startDate.getTime()) {
      const clamped = movedTo(changedTask, earliest, ctx);
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

      const earliest = earliestStart(successor, predecessorDeps, current, ctx);
      if (earliest === null) continue;
      // Lower bound only: push a violating (too-early) successor forward, but
      // never pull it earlier when a predecessor moves back. Compared as instants
      // rather than whole days, so a sub-day violation cascades too.
      if (earliest.getTime() <= successor.startDate.getTime()) continue;

      const next = movedTo(successor, earliest, ctx);
      current.set(successorId, next);
      changed.set(successorId, next);
      queue.enqueue(successorId);
    }
  }

  return changed;
}
