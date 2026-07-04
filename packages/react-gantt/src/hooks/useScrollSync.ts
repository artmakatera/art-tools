import { useCallback, useRef } from "react";
import { useViewportMeasure } from "./useViewportMeasure";

export type { ViewportMetrics } from "./useViewportMeasure";

/**
 * Keep the task-list and grid panes vertically locked together, and expose
 * the grid viewport's metrics for virtualization. Everything returned is
 * identity-stable forever.
 */
export function useScrollSync() {
  const taskListRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  const { viewport, scheduleMeasure } = useViewportMeasure(gridRef);

  const onTaskListScroll = useCallback(() => {
    if (isSyncing.current) {
      return;
    }
    if (!taskListRef.current || !gridRef.current) {
      return;
    }
    isSyncing.current = true;
    gridRef.current.scrollTop = taskListRef.current.scrollTop;
    isSyncing.current = false;
    scheduleMeasure();
  }, [scheduleMeasure]);

  const onGridScroll = useCallback(() => {
    if (gridRef.current && taskListRef.current && !isSyncing.current) {
      isSyncing.current = true;
      taskListRef.current.scrollTop = gridRef.current.scrollTop;
      isSyncing.current = false;
    }
    scheduleMeasure();
  }, [scheduleMeasure]);

  return { taskListRef, gridRef, onTaskListScroll, onGridScroll, viewport };
}
