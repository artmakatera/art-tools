import { useCallback, useMemo, useState } from "react";
import type { GanttTask, Id } from "../types";

/**
 * Per-row tree position, in the shape ARIA needs: `aria-level` is `depth + 1`,
 * `aria-posinset`/`aria-setsize` are 1-based and count only *visible* siblings
 * (children of a collapsed node aren't rendered, and their parent's siblings are
 * always visible whenever it is, so the visible counts are the correct ones).
 */
export interface TreeNodeMeta {
  depth: number;
  posinset: number;
  setsize: number;
  /** Row index in `visibleTasks`. Lets keyboard nav resolve id → index in O(1). */
  index: number;
}

/** Sibling-group key for root-level tasks (`parentId` null or undefined). */
const ROOT = Symbol("root");

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

  // Both panes need identical tree metadata, so derive it once here rather than
  // letting each recompute its own depth map. Relies on the flat list keeping
  // parents ahead of their children, which is the invariant `visibleTasks`
  // (and getTaskList before it) already preserves.
  const treeMeta = useMemo(() => {
    const meta = new Map<Id, TreeNodeMeta>();
    const depths = new Map<Id, number>();
    // Running count per sibling group; after the first pass it holds each
    // group's total, which is exactly `setsize`.
    const groupCounts = new Map<Id | symbol, number>();

    for (const [index, task] of visibleTasks.entries()) {
      const groupKey = task.parentId ?? ROOT;
      const parentDepth = task.parentId != null ? (depths.get(task.parentId) ?? 0) : -1;
      const depth = parentDepth + 1;
      depths.set(task.id, depth);
      const posinset = (groupCounts.get(groupKey) ?? 0) + 1;
      groupCounts.set(groupKey, posinset);
      meta.set(task.id, { depth, posinset, setsize: 0, index });
    }

    for (const task of visibleTasks) {
      const entry = meta.get(task.id)!;
      entry.setsize = groupCounts.get(task.parentId ?? ROOT) ?? 1;
    }

    return meta;
  }, [visibleTasks]);

  return { visibleTasks, expandedIds, parentIds, treeMeta, toggleExpand, revealAncestors };
}
