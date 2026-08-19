import { useMemo } from "react";
import type { ColumnApi, GanttHandle, GanttTask, ResolvedGanttLabels } from "../types";
import { displayEndOf, workingDurationOf, type SchedulingContext } from "../core/taskDates";

interface UseColumnApiOptions {
  handle: GanttHandle;
  readOnly: boolean;
  labels: ResolvedGanttLabels;
  schedulingContext: SchedulingContext;
  /** Latest-ref, so an inline `onTaskEdit` does not churn this value. */
  onTaskEditRef: React.RefObject<((task: GanttTask) => void) | undefined>;
}

/**
 * The API handed to `ColumnDef.render`: the imperative handle plus the few things
 * a column cannot reach on its own.
 *
 * `render` is a plain function, not a component, so it cannot call `useGanttLabels`
 * or read the calendar from context. `labels` and `format` are its channel to
 * both.
 *
 * This value is a dependency of the task-actions context, which every memoized
 * `TaskListRow` consumes — so it must only change when one of its inputs really
 * does. That is why the options object is destructured before the memo.
 */
export function useColumnApi({
  handle,
  readOnly,
  labels,
  schedulingContext,
  onTaskEditRef,
}: UseColumnApiOptions): ColumnApi {
  return useMemo(
    () => ({
      ...handle,
      editTask: (task: GanttTask) => onTaskEditRef.current?.(task),
      readOnly,
      labels,
      format: {
        endDate: (task: GanttTask) => displayEndOf(task, schedulingContext),
        duration: (task: GanttTask) => workingDurationOf(task, schedulingContext),
      },
    }),
    // onTaskEditRef is identity-stable (useLatestRef); listed only to satisfy
    // exhaustive-deps.
    [handle, onTaskEditRef, readOnly, labels, schedulingContext],
  );
}
