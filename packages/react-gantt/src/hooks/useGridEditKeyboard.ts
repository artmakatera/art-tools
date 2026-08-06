import { useCallback } from "react";
import type { CalendarUnit, GanttTask, Id } from "../types";
import type { DatePatch } from "../core/barUtils";
import { nudgeTask, type NudgeEdge, type NudgeRefusal } from "../core/nudge";
import { isEditableTarget } from "../core/keys";
import { useGanttFocusActions } from "../context/GanttContext";
import type { UseRovingFocusResult } from "./useRovingFocus";

interface UseGridEditKeyboardOptions {
  enabled: boolean;
  roving: UseRovingFocusResult;
  visibleTasks: GanttTask[];
  parentIds: Set<Id>;
  unit: CalendarUnit;
  /** Units per column, from the bottom-most scale row. */
  step: number;
  updateTask: (id: Id, patch: DatePatch) => void;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

function refusalMessage(refusal: NudgeRefusal, task: GanttTask): string {
  switch (refusal) {
    case "derived-summary": {
      return `${task.name} is a summary; its dates follow its children`;
    }
    case "milestone-resize": {
      return `${task.name} is a milestone and cannot be resized`;
    }
    case "would-invert": {
      return `${task.name} cannot be shortened further`;
    }
  }
}

/**
 * Keyboard move/resize for the focused bar, gated behind `keyboardEditing`.
 *
 * Commits straight through `updateTask` rather than the `overrides` preview
 * buffer. Overrides exist so a 60fps drag doesn't append 60 undo transactions;
 * a keypress is already one discrete, committed action, and routing it through
 * the preview would desync `DependencyLinksProvider` from the undo log and lose
 * the edit the moment the bar unmounts. One press is therefore one undo step —
 * with any cascaded reschedule folded into the same transaction by `updateTask`.
 *
 * Returns a handler that reports whether it consumed the event, so the grid can
 * fall through to the shared treegrid navigation bindings when it didn't.
 */
export function useGridEditKeyboard({
  enabled,
  roving,
  visibleTasks,
  parentIds,
  unit,
  step,
  updateTask,
}: UseGridEditKeyboardOptions): (e: React.KeyboardEvent) => boolean {
  const { announce } = useGanttFocusActions();
  const { focusedIndex } = roving;

  return useCallback(
    (e: React.KeyboardEvent): boolean => {
      if (!enabled || isEditableTarget(e.target)) {
        return false;
      }
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
        return false;
      }
      // Ctrl/Meta are left alone for browser and OS shortcuts.
      if (e.ctrlKey || e.metaKey) {
        return false;
      }
      const task = visibleTasks[focusedIndex >= 0 ? focusedIndex : 0];
      if (!task) {
        return false;
      }

      // Alt = start edge, Shift = end edge, neither = move the whole bar.
      // Never Alt+Arrow *without* consuming it: that is browser Back/Forward on
      // Windows and Linux, and preventDefault below is what suppresses it.
      let edge: NudgeEdge = "move";
      if (e.altKey) {
        edge = "start";
      } else if (e.shiftKey) {
        edge = "end";
      }

      const direction = e.key === "ArrowRight" ? 1 : -1;
      const result = nudgeTask(task, edge, unit, step, direction, {
        isDerivedSummary: task.type === "summary" && parentIds.has(task.id),
      });

      e.preventDefault();
      e.stopPropagation();

      if (result.refusal) {
        announce(refusalMessage(result.refusal, task));
        return true;
      }

      updateTask(task.id, result.patch);

      // `scheduleDependents` can clamp a move that would violate the task's own
      // predecessors, so the bar may not visibly shift. Announcing the dates we
      // asked for would then be a lie, but staying silent makes the key look
      // dead — so state the intent and let the next focus read the truth.
      const { startDate, endDate } = result.patch;
      if (edge === "start" && startDate) {
        announce(`${task.name}, starts ${formatDate(startDate)}`);
      } else if (edge === "end" && endDate) {
        announce(`${task.name}, ends ${formatDate(endDate)}`);
      } else if (startDate) {
        announce(
          endDate
            ? `${task.name}, ${formatDate(startDate)} to ${formatDate(endDate)}`
            : `${task.name}, ${formatDate(startDate)}`,
        );
      }
      return true;
    },
    [enabled, visibleTasks, focusedIndex, unit, step, parentIds, updateTask, announce],
  );
}
