import { useCallback, useEffect, useRef, useState } from "react";
import type { Id, TaskDependency } from "../types";
import { useLatestRef } from "./useLatestRef";

export type ConnectorHandle = "start" | "end";

export interface DependencyDragState {
  fromTaskId: Id;
  handle: ConnectorHandle;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const HANDLE_TO_TYPE: Record<ConnectorHandle, Record<ConnectorHandle, TaskDependency["type"]>> = {
  end: { start: "FS", end: "FF" },
  start: { start: "SS", end: "SF" },
};

interface UseDependencyDragOptions {
  /** Grid body element; preview coordinates are relative to its rect. */
  gridBodyRef: React.RefObject<HTMLDivElement | null>;
  onDependencyCreate?: (dep: TaskDependency) => void;
}

/**
 * Imperative engine for drawing a dependency between two bars: window-level
 * mousemove/mouseup listeners installed at drag start, rAF-coalesced position
 * updates, idempotent teardown (mouseup / endDrag / unmount). `startDrag` and
 * `endDrag` are identity-stable forever.
 */
export function useDependencyDrag({ gridBodyRef, onDependencyCreate }: UseDependencyDragOptions): {
  drag: DependencyDragState | null;
  startDrag: (state: DependencyDragState) => void;
  startKeyboardLink: (state: DependencyDragState) => void;
  moveKeyboardLink: (currentX: number, currentY: number) => void;
  endDrag: (toTaskId: Id | null, toHandle?: ConnectorHandle) => void;
  canCreateDependency: boolean;
} {
  const onDependencyCreateRef = useLatestRef(onDependencyCreate);

  const [drag, setDrag] = useState<DependencyDragState | null>(null);
  // Mirror for handlers (endDrag) so they can read the current drag without
  // subscribing to it; drag is committed at mousedown, well before any mouseup.
  const dragRef = useLatestRef(drag);
  const dragListenersRef = useRef<{ move: (e: MouseEvent) => void; up: (e: MouseEvent) => void } | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);

  // Idempotent: safe to call from mouseup, endDrag, and unmount in any order.
  const clearDragListeners = useCallback(() => {
    if (dragListenersRef.current) {
      window.removeEventListener("mousemove", dragListenersRef.current.move);
      window.removeEventListener("mouseup", dragListenersRef.current.up);
      dragListenersRef.current = null;
    }
    if (dragFrameRef.current !== null) {
      cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
  }, []);

  // The window listeners would leak if the owner unmounted mid-drag.
  useEffect(() => clearDragListeners, [clearDragListeners]);

  /**
   * Begin a link without installing any pointer listeners.
   *
   * The keyboard flow spans many keystrokes, and `startDrag`'s window `mouseup`
   * unconditionally cancels the drag — so the first stray click anywhere on the
   * page (including the one that gave the Gantt focus) would silently kill it.
   * The mouse flow only survives that because its own React-delegated mouseup
   * runs first.
   */
  const startKeyboardLink = useCallback((state: DependencyDragState) => {
    setDrag(state);
  }, []);

  /** Reposition the rubber band's free end, in grid-body coordinates. */
  const moveKeyboardLink = useCallback((currentX: number, currentY: number) => {
    setDrag((prev) => (prev ? { ...prev, currentX, currentY } : null));
  }, []);

  const startDrag = useCallback(
    (state: DependencyDragState) => {
      setDrag(state);

      // Coalesce mousemove bursts into one state update per frame. The rect is
      // re-read inside the frame: the body's viewport-relative position shifts
      // while the grid scrolls under the cursor.
      const onMouseMove = (e: MouseEvent) => {
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        if (dragFrameRef.current !== null) {
          return;
        }
        dragFrameRef.current = requestAnimationFrame(() => {
          dragFrameRef.current = null;
          const body = gridBodyRef.current;
          const last = lastMouseRef.current;
          if (!body || !last) {
            return;
          }
          const rect = body.getBoundingClientRect();
          setDrag((prev) =>
            prev
              ? { ...prev, currentX: last.x - rect.left, currentY: last.y - rect.top }
              : null,
          );
        });
      };

      const onMouseUp = () => {
        setDrag(null);
        clearDragListeners();
      };

      dragListenersRef.current = { move: onMouseMove, up: onMouseUp };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [clearDragListeners, gridBodyRef],
  );

  const endDrag = useCallback(
    (toTaskId: Id | null, toHandle?: ConnectorHandle) => {
      const current = dragRef.current;
      if (current && toTaskId !== null && toHandle && toTaskId !== current.fromTaskId) {
        const type = HANDLE_TO_TYPE[current.handle][toHandle];
        onDependencyCreateRef.current?.({ from: current.fromTaskId, to: toTaskId, type });
      }
      setDrag(null);
      clearDragListeners();
    },
    [clearDragListeners, dragRef, onDependencyCreateRef],
  );

  return {
    drag,
    startDrag,
    startKeyboardLink,
    moveKeyboardLink,
    endDrag,
    // Lets the grid keep Enter free when the consumer never wired up links,
    // instead of entering a link mode that can't produce anything.
    canCreateDependency: onDependencyCreate !== undefined,
  };
}
