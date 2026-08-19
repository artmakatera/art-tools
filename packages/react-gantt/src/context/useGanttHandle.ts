import { useMemo } from "react";
import type { GanttHandle } from "../types";

/**
 * Assembles the imperative handle once, so `apiRef` and `columnApi` cannot drift
 * apart.
 *
 * They shared nine members built in two separate `useMemo`s with two 9-entry
 * dependency arrays — and `ColumnApi extends GanttHandle` already said that set
 * *is* the handle. Building it here makes that structural, and collapses the two
 * arrays into one.
 *
 * Invalidation is unchanged: the returned object's identity changes exactly when
 * one of the nine changes, which is exactly when both old arrays fired.
 */
export function useGanttHandle(members: GanttHandle): GanttHandle {
  const { createTask, updateTask, deleteTask, undo, redo, revealTask, zoomIn, zoomOut, setZoom } =
    members;
  // Destructured above so the deps are the individual callbacks, not the argument
  // object — which is a fresh literal on every render of the provider.
  return useMemo(
    () => ({
      createTask,
      updateTask,
      deleteTask,
      undo,
      redo,
      revealTask,
      zoomIn,
      zoomOut,
      setZoom,
    }),
    [createTask, updateTask, deleteTask, undo, redo, revealTask, zoomIn, zoomOut, setZoom],
  );
}
