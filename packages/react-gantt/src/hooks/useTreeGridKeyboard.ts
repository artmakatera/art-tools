import { useCallback } from "react";
import type { GanttTask, Id } from "../types";
import { isEditableTarget } from "../core/keys";
import type { TreeNodeMeta } from "./useExpand";
import type { UseRovingFocusResult } from "./useRovingFocus";

interface UseTreeGridKeyboardOptions {
  roving: UseRovingFocusResult;
  visibleTasks: GanttTask[];
  parentIds: Set<Id>;
  expandedIds: Set<Id>;
  treeMeta: Map<Id, TreeNodeMeta>;
  toggleExpand: (id: Id) => void;
  /** Enter, and Space on a leaf. Distinct from moving the cursor. */
  onActivate: (task: GanttTask) => void;
}

/**
 * The navigation bindings shared by both panes, per the WAI-ARIA treegrid
 * pattern. Panes compose this with their own bindings (zoom, editing, linking)
 * by running theirs first and only falling through to this handler.
 *
 * Every consumed key calls `preventDefault`: the handler is attached inside a
 * scroll container, so arrows, Home/End, PageUp/PageDown and Space would all
 * otherwise scroll it out from under the cursor.
 */
export function useTreeGridKeyboard({
  roving,
  visibleTasks,
  parentIds,
  expandedIds,
  treeMeta,
  toggleExpand,
  onActivate,
}: UseTreeGridKeyboardOptions): React.KeyboardEventHandler {
  const { focusedIndex, moveTo, focusTask, pageRows } = roving;

  return useCallback(
    (e: React.KeyboardEvent) => {
      // Columns are rendered by the consumer, so a cell can contain an inline
      // editor. Never hijack keys aimed at one.
      if (isEditableTarget(e.target)) {
        return;
      }
      if (visibleTasks.length === 0) {
        return;
      }
      // Before the first arrow key the cursor may be unset while DOM focus sits
      // on the pane's fallback stop; treat that as row 0.
      const index = focusedIndex >= 0 ? focusedIndex : 0;
      const task = visibleTasks[index];
      if (!task) {
        return;
      }
      const isParent = parentIds.has(task.id);
      const isExpanded = expandedIds.has(task.id);
      const consume = () => {
        e.preventDefault();
        e.stopPropagation();
      };

      switch (e.key) {
        case "ArrowDown": {
          consume();
          moveTo(index + 1);
          return;
        }
        case "ArrowUp": {
          consume();
          moveTo(index - 1);
          return;
        }
        case "Home": {
          consume();
          moveTo(0);
          return;
        }
        case "End": {
          consume();
          moveTo(visibleTasks.length - 1);
          return;
        }
        case "PageDown": {
          consume();
          moveTo(index + pageRows());
          return;
        }
        case "PageUp": {
          consume();
          moveTo(index - pageRows());
          return;
        }
        case "ArrowRight": {
          consume();
          if (isParent && !isExpanded) {
            toggleExpand(task.id);
          } else if (isParent) {
            // Already open: step onto the first child, which the flat ordering
            // guarantees is the next visible row.
            moveTo(index + 1);
          }
          return;
        }
        case "ArrowLeft": {
          consume();
          if (isParent && isExpanded) {
            toggleExpand(task.id);
          } else if (task.parentId != null && treeMeta.has(task.parentId)) {
            focusTask(task.parentId);
          }
          return;
        }
        case "Enter": {
          // preventDefault also suppresses the synthetic click a focused
          // <button> would fire, so the expand toggle can't run twice.
          consume();
          onActivate(task);
          return;
        }
        case " ":
        case "Spacebar": {
          consume();
          if (isParent) {
            toggleExpand(task.id);
          } else {
            onActivate(task);
          }
          return;
        }
        default:
          return;
      }
    },
    [
      visibleTasks,
      focusedIndex,
      parentIds,
      expandedIds,
      treeMeta,
      moveTo,
      focusTask,
      pageRows,
      toggleExpand,
      onActivate,
    ],
  );
}
