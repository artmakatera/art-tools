import type { ChangeLog, GanttTask, Id } from "../types";
import { getEndDate } from "./dateUtils";

type TaskRecordsByParentId = Map<Id | null, GanttTask[]>;

/**
 * Group an already-resolved, ordered task map into the flattened display list
 * (parents rolled up from their children). Takes the resolved map rather than
 * `(tasks, log)` so callers that already hold the resolved state don't pay for
 * a second replay.
 */
export function getTaskList(resolvedById: Map<Id, GanttTask>): GanttTask[] {
  const taskByParentId = groupTaskByParentId(resolvedById.values());
  const roots = taskByParentId.get(null) ?? [];
  return roots.flatMap(
    (root) => buildSubtree(root, taskByParentId).flattened,
  );
}

/**
 * Replay the applied slice of the change log (`transactions[0..cursor]`) over
 * the seed tasks, returning the effective tasks keyed by id in display order.
 * An explicit `order` array preserves positional create/delete; the returned
 * insertion-ordered `Map` keeps lookups O(1) and carries the display order.
 * Only create/delete touch `order`, so the common case (updates) stays cheap.
 */
export function resolveCommittedTasks(
  tasks: GanttTask[],
  log: ChangeLog,
): Map<Id, GanttTask> {
  const order: Id[] = tasks.map((t) => t.id);
  const byId = new Map<Id, GanttTask>(tasks.map((t) => [t.id, t]));

  const applied = log.transactions.slice(0, log.cursor);
  for (const transaction of applied) {
    for (const cmd of transaction) {
      switch (cmd.type) {
        case "update":
          if (byId.has(cmd.task.id)) byId.set(cmd.task.id, cmd.task);
          break;
        case "create": {
          byId.set(cmd.task.id, cmd.task);
          const at =
            cmd.afterId == null
              ? order.length
              : order.indexOf(cmd.afterId) + 1;
          order.splice(at, 0, cmd.task.id);
          break;
        }
        case "delete": {
          byId.delete(cmd.id);
          const i = order.indexOf(cmd.id);
          if (i !== -1) order.splice(i, 1);
          break;
        }
      }
    }
  }

  const resolvedById = new Map<Id, GanttTask>();
  for (const id of order) {
    const task = byId.get(id);
    if (task) resolvedById.set(id, task);
  }
  return resolvedById;
}

interface Subtree {
  effective: GanttTask;
  flattened: GanttTask[];
}

function buildSubtree(
  task: GanttTask,
  taskByParentId: TaskRecordsByParentId,
): Subtree {
  const direct = taskByParentId.get(task.id) ?? [];

  if (direct.length === 0) {
    return { effective: task, flattened: [task] };
  }

  const subtrees = direct.map((c) => buildSubtree(c, taskByParentId));
  const effectiveDirect = subtrees.map((s) => s.effective);
  const flattenedDescendants = subtrees.flatMap((s) => s.flattened);
  const parentEffective = getParentTaskData(task, effectiveDirect);

  return {
    effective: parentEffective,
    flattened: [parentEffective].concat(flattenedDescendants),
  };
}

export function getParentTaskData(
  task: GanttTask,
  children: GanttTask[],
): GanttTask {
  if (children.length === 0) return task;

  let { startDate, endDate: taskEndDate, duration } = children[0]!;

  let endDate = getEndDate(startDate, taskEndDate, duration);
  let progressSum = 0;
  let notMilestoneCount = 0;

  for (const child of children) {
    if (child.startDate < startDate) startDate = child.startDate;
    if (child.progress !== undefined) progressSum += child.progress;

      if (child.endDate && (!endDate || child.endDate > endDate)) {
        endDate = child.endDate;
      }

      if (child.type !== "milestone") {
        notMilestoneCount++;
      }
  }

  const progress = Math.round(progressSum /notMilestoneCount) || 0;

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
