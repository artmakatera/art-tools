
import type { GanttTask, Id } from "../types";
import { getEndDate } from "./dateUtils";



export function getTaskList(tasks: GanttTask[], parentId: Id | null = null): GanttTask[] {
  const taskByParentId = groupTaskByParentId(tasks);
  const taskList = taskByParentId.get(parentId) ?? [];

  return taskList.flatMap(task => {
    const isParent = taskByParentId.has(task.id);
    if (!isParent) return task;

    const parentTaskData = getParentTaskData(task, taskByParentId.get(task.id) ?? []);

    const children = getTaskList(tasks, task.id);
    return [parentTaskData].concat(children);
  });
}

export function getParentTaskData(task: GanttTask, children: GanttTask[]): GanttTask {
  if (children.length === 0) return task;

  let { startDate, endDate: taskEndDate, duration } = children[0]!;

  let endDate = getEndDate(startDate, taskEndDate, duration)
  let progressSum = 0;

  for (const child of children) {
    if (child.startDate < startDate) startDate = child.startDate;
    if (child.progress !== undefined) progressSum += child.progress;


    if (child.endDate && (!endDate || child.endDate > endDate)) endDate = child.endDate;
  }

  const progress = Math.round(progressSum / children.length);

  return {
    ...task,
    startDate,
    endDate,
    progress,
  }
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



type TaskRecordsByParentId = Map<Id | null, GanttTask[]>;