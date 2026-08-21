import { useCallback, useMemo, useState } from "react";
import type { GanttTask, Id } from "../types";
import { useLatestRef } from "./useLatestRef";

export function useExpand(tasksList: GanttTask[]) {
  const parentIds = useMemo(() => {
    const ids = new Set<Id>();
    for (const t of tasksList) {
      if (t.parentId != null) {
        ids.add(t.parentId);
      }
    }
    return ids;
  }, [tasksList]);

  const [collapsedIds, setCollapsedIds] = useState<Set<Id>>(new Set());

  const toggleExpand = useCallback((id: Id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const tasksListRef = useLatestRef(tasksList);

  // Returns the previous set unchanged when nothing was collapsed, so a reveal
  // that has no work to do does not trigger a render.
  //
  // The id → task index is built here rather than memoized per render: nothing
  // reads it during render, so an eager index would tax every edit (~15ms at
  // 100k tasks) to serve a walk that only happens on an explicit reveal — and
  // only when something is actually collapsed.
  const revealAncestors = useCallback(
    (id: Id) => {
      setCollapsedIds((prev) => {
        if (prev.size === 0) {
          return prev;
        }
        const taskById = new Map<Id, GanttTask>();
        for (const t of tasksListRef.current) {
          taskById.set(t.id, t);
        }
        const next = new Set(prev);
        let changed = false;
        let cur = taskById.get(id);
        while (cur && cur.parentId != null) {
          if (next.delete(cur.parentId)) {
            changed = true;
          }
          cur = taskById.get(cur.parentId);
        }
        return changed ? next : prev;
      });
    },
    [tasksListRef],
  );

  const expandedIds = useMemo(() => {
    const expanded = new Set<Id>();
    for (const id of parentIds) {
      if (!collapsedIds.has(id)) {
        expanded.add(id);
      }
    }
    return expanded;
  }, [parentIds, collapsedIds]);

  const visibleTasks = useMemo(() => {
    if (collapsedIds.size === 0) {
      return tasksList;
    }
    const hiddenAncestors = new Set<Id>();
    const result: GanttTask[] = [];
    for (const task of tasksList) {
      if (
        task.parentId != null &&
        (hiddenAncestors.has(task.parentId) || collapsedIds.has(task.parentId))
      ) {
        hiddenAncestors.add(task.id);
        continue;
      }
      result.push(task);
    }
    return result;
  }, [tasksList, collapsedIds]);

  return { visibleTasks, expandedIds, parentIds, toggleExpand, revealAncestors };
}
