import { useCallback, useMemo, useState } from "react";
import type { GanttTask, Id } from "../types";

export function useExpand(tasksList: GanttTask[]) {
  const parentIds = useMemo(() => {
    const ids = new Set<Id>();
    for (const t of tasksList) {
      if (t.parentId != null) ids.add(t.parentId);
    }
    return ids;
  }, [tasksList]);

  const [collapsedIds, setCollapsedIds] = useState<Set<Id>>(new Set());

  const toggleExpand = useCallback((id: Id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const taskById = useMemo(() => {
    const map = new Map<Id, GanttTask>();
    for (const t of tasksList) {
      map.set(t.id, t);
    }
    return map;
  }, [tasksList]);

  // Expand every collapsed ancestor of `id` so the task becomes visible. Walks
  // the parentId chain and removes those ids from the collapsed set. Returns the
  // previous set unchanged when nothing was collapsed, to avoid needless renders.
  const revealAncestors = useCallback(
    (id: Id) => {
      setCollapsedIds((prev) => {
        if (prev.size === 0) {
          return prev;
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
    [taskById],
  );

  const expandedIds = useMemo(() => {
    const expanded = new Set<Id>();
    for (const id of parentIds) {
      if (!collapsedIds.has(id)) expanded.add(id);
    }
    return expanded;
  }, [parentIds, collapsedIds]);

  const visibleTasks = useMemo(() => {
    if (collapsedIds.size === 0) return tasksList;
    const hiddenAncestors = new Set<Id>();
    const result: GanttTask[] = [];
    for (const task of tasksList) {
      if (task.parentId != null && (hiddenAncestors.has(task.parentId) || collapsedIds.has(task.parentId))) {
        hiddenAncestors.add(task.id);
        continue;
      }
      result.push(task);
    }
    return result;
  }, [tasksList, collapsedIds]);

  return { visibleTasks, expandedIds, parentIds, toggleExpand, revealAncestors };
}
