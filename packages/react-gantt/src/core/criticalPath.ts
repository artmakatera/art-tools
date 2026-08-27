import type { GanttTask, Id, TaskDependencyType } from "../types";
import type { SchedulingContext } from "./taskDates";
import { Queue } from "./queue";
import { constrainedStart, spanOf, workingLengthOf, type DependencyGraph } from "./scheduling";
import { addWorkingMs, countWorkingMs, workingMsPerUnit } from "./workingTime";

export interface CriticalPathResult {
  criticalTaskIds: Set<Id>;
  /** `"${dep.from}->${dep.to}"`, matching `DependencyLink.id` in `geometry.ts`. */
  criticalDependencyKeys: Set<string>;
}

const EMPTY_RESULT: CriticalPathResult = {
  criticalTaskIds: new Set(),
  criticalDependencyKeys: new Set(),
};

/**
 * The predecessor's latest allowed finish, given the successor's own late start —
 * the mirror image of {@link constrainedStart} (ADR-023).
 *
 * `constrainedStart` always normalizes its output to the successor's *start*,
 * using `successorLength` to convert a finish-anchored FF/SF result back to one.
 * This mirrors that exactly, but normalizes to the predecessor's *finish*,
 * using `predecessorLength` to convert a start-anchored SS/SF result forward.
 * Each case reuses the identical anchor direction (`anchorDir`) `constrainedStart`
 * uses for that dependency type, because it is solving the same equation for the
 * other variable — the anchor is a property of which point (start or finish) the
 * relationship type treats as the constraint, not of which side is unknown.
 *
 * The one exception is converting a task's own start into its own end (or back) via
 * its own working length — that is not part of the cross-task constraint at all, so
 * it always uses `anchorDir: 1`, matching `movedTo`'s own start-to-end convention in
 * `scheduling.ts`, regardless of which dependency type triggered the need for it.
 *
 * Like `constrainedStart`, this is lossy when an intermediate value lands in
 * non-working time (ADR-007) — accepted for the same reason.
 */
function constrainedLateFinish(
  succLateStart: Date,
  type: TaskDependencyType,
  lagMs: number,
  successorLength: number,
  predecessorLength: number,
  ctx: SchedulingContext,
): Date {
  const cal = ctx.calendar;
  switch (type) {
    case "FS": // predecessor's finish is exactly what pins the successor's start
      return addWorkingMs(cal, succLateStart, -lagMs, 1);
    case "SS": {
      const predStart = addWorkingMs(cal, succLateStart, -lagMs, 1);
      return addWorkingMs(cal, predStart, predecessorLength, 1);
    }
    case "FF": {
      const succLateFinish = addWorkingMs(cal, succLateStart, successorLength, -1);
      return addWorkingMs(cal, succLateFinish, -lagMs, -1);
    }
    case "SF": {
      const succLateFinish = addWorkingMs(cal, succLateStart, successorLength, -1);
      const predStart = addWorkingMs(cal, succLateFinish, -lagMs, -1);
      return addWorkingMs(cal, predStart, predecessorLength, 1);
    }
  }
}

/**
 * Critical-path analysis over the chart's *actual, currently committed* schedule
 * (ADR-023) — not a hypothetical earliest-possible one. A task is critical when it
 * has zero working-time float between its actual start and the latest start it
 * could take without moving the chart's actual current end date; a dependency link
 * is critical only when it is the specific predecessor whose constraint exactly
 * pins the successor's actual start, not merely a link between two tasks that both
 * happen to be critical.
 *
 * `resolvedById` and `graph` should be the same resolved task map and dependency
 * graph the rest of the chart renders from (`useTaskList`'s `resolvedById` and
 * `buildDependencyGraph(dependencies)`), so the result matches what is on screen.
 */
export function computeCriticalPath(
  resolvedById: ReadonlyMap<Id, GanttTask>,
  graph: DependencyGraph,
  ctx: SchedulingContext,
): CriticalPathResult {
  if (resolvedById.size === 0) {
    return EMPTY_RESULT;
  }
  const { successorsOf, predecessorDeps } = graph;
  const msPerUnit = workingMsPerUnit(ctx.calendar, ctx.durationUnit);

  let projectEnd: Date | null = null;
  for (const task of resolvedById.values()) {
    const end = spanOf(task, ctx).end;
    if (projectEnd === null || end.getTime() > projectEnd.getTime()) {
      projectEnd = end;
    }
  }
  if (projectEnd === null) {
    return EMPTY_RESULT;
  }

  // Backward pass in reverse-topological order: a task's late start can only be
  // computed once every one of its successors' late starts is known. Seeded with
  // sinks (no successors), draining toward sources — the mirror of the forward
  // BFS `scheduleDependents` runs. `remaining` counts each task's *outgoing*
  // edges; every edge decrements its source's count exactly once, when the edge's
  // target is finalized, so parallel edges between the same pair are counted
  // consistently on both sides.
  const lateStart = new Map<Id, Date>();
  const remaining = new Map<Id, number>();
  const queue = new Queue<Id>();
  for (const task of resolvedById.values()) {
    const count = (successorsOf.get(task.id) ?? []).length;
    remaining.set(task.id, count);
    if (count === 0) {
      queue.enqueue(task.id);
    }
  }

  const maxIterations = (graph.size + 1) * (resolvedById.size + 1);
  let iterations = 0;
  while (!queue.isEmpty()) {
    if (iterations++ > maxIterations) {
      break; // guard against dependency cycles, mirrors scheduleDependents
    }
    const id = queue.dequeue()!;
    const task = resolvedById.get(id);
    if (!task || lateStart.has(id)) {
      continue;
    }

    const successors = successorsOf.get(id) ?? [];
    let lateFinish: Date = projectEnd;
    for (const succId of successors) {
      const succTask = resolvedById.get(succId);
      const succLateStart = lateStart.get(succId);
      if (!succTask || !succLateStart) {
        continue;
      }
      for (const dep of predecessorDeps.get(succId) ?? []) {
        if (dep.from !== id) {
          continue;
        }
        const candidate = constrainedLateFinish(
          succLateStart,
          dep.type,
          (dep.lag ?? 0) * msPerUnit,
          workingLengthOf(succTask, ctx),
          workingLengthOf(task, ctx),
          ctx,
        );
        if (candidate.getTime() < lateFinish.getTime()) {
          lateFinish = candidate;
        }
      }
    }
    lateStart.set(id, addWorkingMs(ctx.calendar, lateFinish, -workingLengthOf(task, ctx), -1));

    for (const dep of predecessorDeps.get(id) ?? []) {
      const left = (remaining.get(dep.from) ?? 0) - 1;
      remaining.set(dep.from, left);
      if (left === 0) {
        queue.enqueue(dep.from);
      }
    }
  }

  // A task is critical when it has no positive float between its actual start
  // and its late start. `<= 0` rather than strict equality: a feasible committed
  // schedule never has negative float, so this only ever absorbs the lossy-anchor
  // artifacts ADR-007 already accepts, not a real negative-float case.
  const criticalTaskIds = new Set<Id>();
  for (const task of resolvedById.values()) {
    const ls = lateStart.get(task.id);
    if (ls && countWorkingMs(ctx.calendar, task.startDate, ls) <= 0) {
      criticalTaskIds.add(task.id);
    }
  }

  // A dependency is critical only when it is the specific edge that binds the
  // successor's actual start — reusing `constrainedStart` (the same forward
  // constraint `scheduleDependents` enforces) rather than treating any edge
  // between two critical tasks as critical.
  const criticalDependencyKeys = new Set<string>();
  for (const task of resolvedById.values()) {
    if (!criticalTaskIds.has(task.id)) {
      continue;
    }
    for (const dep of predecessorDeps.get(task.id) ?? []) {
      const pred = resolvedById.get(dep.from);
      if (!pred || !criticalTaskIds.has(dep.from)) {
        continue;
      }
      const bound = constrainedStart(
        spanOf(pred, ctx),
        dep.type,
        (dep.lag ?? 0) * msPerUnit,
        workingLengthOf(task, ctx),
        ctx,
      );
      if (bound.getTime() === task.startDate.getTime()) {
        criticalDependencyKeys.add(`${dep.from}->${dep.to}`);
      }
    }
  }

  return { criticalTaskIds, criticalDependencyKeys };
}
