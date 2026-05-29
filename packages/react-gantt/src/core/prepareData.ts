import type { CommittedOverrides, GanttTask, Id } from "../types";
import { getEndDate } from "./dateUtils";

type TaskRecordsByParentId = Map<Id | null, GanttTask[]>;

export function getTaskList(
  tasks: GanttTask[],
  commitedChanges: CommittedOverrides = {},
): GanttTask[] {
  const resolved = resolveCommittedTasks(tasks, commitedChanges);
  const taskByParentId = groupTaskByParentId(resolved);
  const roots = taskByParentId.get(null) ?? [];
  return roots.flatMap(
    (root) => buildSubtree(root, taskByParentId).flattened,
  );
}

function resolveCommittedTasks(
  tasks: GanttTask[],
  commitedChanges: CommittedOverrides,
): GanttTask[] {
  const result: GanttTask[] = [];
  const seenIds = new Set<Id>();

  for (const task of tasks) {
    seenIds.add(task.id);
    const commands = commitedChanges[task.id];
    const latest = commands?.[commands.length - 1];
    if (latest?.type === "delete") continue;
    result.push(latest?.task ?? task);
  }

  for (const commands of Object.values(commitedChanges)) {
    const latest = commands[commands.length - 1];
    if (latest?.type === "create" && !seenIds.has(latest.task.id)) {
      result.push(latest.task);
    }
  }

  return result;
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

  for (const child of children) {
    if (child.startDate < startDate) startDate = child.startDate;
    if (child.progress !== undefined) progressSum += child.progress;

    if (child.endDate && (!endDate || child.endDate > endDate))
      endDate = child.endDate;
  }

  const progress = Math.round(progressSum / children.length);

  return {
    ...task,
    startDate,
    endDate,
    progress,
  };
}

function groupTaskByParentId(tasks: GanttTask[]): TaskRecordsByParentId {
  return tasks.reduce<TaskRecordsByParentId>((acc, task) => {
    const parentId = task.parentId ?? null;
    const siblings = acc.get(parentId) ?? [];
    siblings.push(task);
    acc.set(parentId, siblings);

    return acc;
  }, new Map());
}
