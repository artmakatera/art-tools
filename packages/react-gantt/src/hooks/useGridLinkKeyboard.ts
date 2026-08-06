import { useCallback, useEffect, useRef } from "react";
import type { CalendarUnit, GanttTask, Id, TaskDependency, TaskState } from "../types";
import { computeTaskPixels } from "../core/barUtils";
import { connectorAnchor } from "../components/bars/common/connectorGeometry";
import { canLink, type LinkVerdict } from "../core/linkValidation";
import { isEditableTarget } from "../core/keys";
import {
  useGanttDependency,
  useGanttDependencyDrag,
  useGanttFocus,
  useGanttFocusActions,
  useGanttScroll,
} from "../context/GanttContext";
import type { ConnectorHandle } from "./useDependencyDrag";
import type { UseRovingFocusResult } from "./useRovingFocus";

interface UseGridLinkKeyboardOptions {
  enabled: boolean;
  roving: UseRovingFocusResult;
  visibleTasks: GanttTask[];
  overrides: Record<Id, Partial<TaskState>>;
  origin: Date | undefined;
  colWidth: number;
  rowHeight: number;
  unit: CalendarUnit;
  snapToDay: boolean;
}

/** Source handle × target handle → dependency type, mirroring HANDLE_TO_TYPE. */
const TYPE_BY_HANDLES: Record<ConnectorHandle, Record<ConnectorHandle, TaskDependency["type"]>> = {
  end: { start: "FS", end: "FF" },
  start: { start: "SS", end: "SF" },
};

const TYPE_LABEL: Record<TaskDependency["type"], string> = {
  FS: "finish to start",
  FF: "finish to finish",
  SS: "start to start",
  SF: "start to finish",
};

function refusalMessage(verdict: Exclude<LinkVerdict, "ok">, name: string): string {
  switch (verdict) {
    case "self": {
      return "A task cannot depend on itself";
    }
    case "duplicate": {
      return `A link to ${name} already exists`;
    }
    case "cycle": {
      return `Linking to ${name} would create a circular dependency`;
    }
  }
}

/**
 * Keyboard dependency-link creation: pick a source edge, walk to a target, pick
 * its edge, confirm.
 *
 * Reuses the pointer flow's engine — `endDrag` and its FS/FF/SS/SF mapping are
 * shared — but enters through `startKeyboardLink`, which installs no window
 * listeners. Progress lives in `linkTarget` on the focus context; the source and
 * its edge live in the existing drag state, so `DependencyPreview` renders the
 * rubber band with no changes.
 *
 * Returns a handler reporting whether it consumed the event, so the grid falls
 * through to editing and navigation when no link is in progress.
 */
export function useGridLinkKeyboard({
  enabled,
  roving,
  visibleTasks,
  overrides,
  origin,
  colWidth,
  rowHeight,
  unit,
  snapToDay,
}: UseGridLinkKeyboardOptions): (e: React.KeyboardEvent) => boolean {
  const { dependencies, startKeyboardLink, moveKeyboardLink, endDrag, canCreateDependency } =
    useGanttDependency();
  const { linkTarget } = useGanttFocus();
  const { setLinkTarget, setFocus, announce } = useGanttFocusActions();
  const { scrollToTask } = useGanttScroll();
  const drag = useGanttDependencyDrag();
  const { focusedIndex } = roving;

  const linking = drag !== null && linkTarget !== null;

  // Anchor point of a task's handle, in grid-body coordinates. Computed rather
  // than measured, so a target outside the virtualization window still moves the
  // preview instead of leaving it stuck at the source.
  const anchorFor = useCallback(
    (task: GanttTask, index: number, handle: ConnectorHandle) => {
      if (!origin) {
        return null;
      }
      const { left, width } = computeTaskPixels(
        task,
        overrides[task.id] ?? {},
        origin,
        colWidth,
        unit,
        { snapToDay },
      );
      return connectorAnchor(handle, left, width, index, rowHeight);
    },
    [origin, overrides, colWidth, unit, snapToDay, rowHeight],
  );

  // Keep the rubber band's free end on the current target as it moves, and as
  // zoom or an edit changes the geometry underneath it.
  const targetIndex = linkTarget
    ? visibleTasks.findIndex((t) => t.id === linkTarget.taskId)
    : -1;
  const targetTask = targetIndex >= 0 ? visibleTasks[targetIndex] : undefined;
  const moveRef = useRef(moveKeyboardLink);
  moveRef.current = moveKeyboardLink;
  const anchorRef = useRef(anchorFor);
  anchorRef.current = anchorFor;

  useEffect(() => {
    if (!linking || !targetTask || !linkTarget) {
      return;
    }
    const point = anchorRef.current(targetTask, targetIndex, linkTarget.handle);
    if (point) {
      moveRef.current(point.x, point.y);
    }
  }, [linking, targetTask, targetIndex, linkTarget]);

  return useCallback(
    (e: React.KeyboardEvent): boolean => {
      if (!enabled || isEditableTarget(e.target)) {
        return false;
      }
      const consume = () => {
        e.preventDefault();
        e.stopPropagation();
      };

      // --- Not linking yet: Enter opens a link from the focused bar ---
      if (!linking) {
        if (e.key !== "Enter" || !canCreateDependency || e.ctrlKey || e.metaKey) {
          return false;
        }
        const source = visibleTasks[focusedIndex >= 0 ? focusedIndex : 0];
        if (!source) {
          return false;
        }
        // Shift starts from the bar's start edge (SS/SF); plain Enter from its
        // end edge (FS/FF), which is the overwhelmingly common relationship.
        const sourceHandle: ConnectorHandle = e.shiftKey ? "start" : "end";
        const sourceIndex = visibleTasks.indexOf(source);
        const from = anchorFor(source, sourceIndex, sourceHandle);
        if (!from) {
          return false;
        }
        // Seed the target on a neighbouring task so the flow starts somewhere
        // valid; never on the source itself.
        const seed = visibleTasks[sourceIndex + 1] ?? visibleTasks[sourceIndex - 1];
        if (!seed) {
          announce("No other task to link to");
          consume();
          return true;
        }
        consume();
        startKeyboardLink({
          fromTaskId: source.id,
          handle: sourceHandle,
          startX: from.x,
          startY: from.y,
          currentX: from.x,
          currentY: from.y,
        });
        setLinkTarget({ taskId: seed.id, handle: "start" });
        // Move the roving stop onto the source handle: this is the "focus
        // management for connector handles" that makes them reachable at all —
        // they are tabIndex -1 at every other moment.
        setFocus({
          pane: "grid",
          taskId: source.id,
          slot: sourceHandle === "start" ? "startHandle" : "endHandle",
        });
        announce(
          `Linking from ${sourceHandle} of ${source.name}. Up and down choose a task, left and right its edge, Enter confirms, Escape cancels.`,
        );
        return true;
      }

      // --- Linking: arrows choose the target, Enter commits, Escape cancels ---
      const cancel = () => {
        endDrag(null);
        setLinkTarget(null);
        if (drag) {
          setFocus({ pane: "grid", taskId: drag.fromTaskId, slot: "bar" });
        }
      };

      switch (e.key) {
        case "Escape": {
          consume();
          cancel();
          announce("Link cancelled");
          return true;
        }
        case "ArrowDown":
        case "ArrowUp": {
          consume();
          const step = e.key === "ArrowDown" ? 1 : -1;
          let next = targetIndex + step;
          // Skip the source: a task cannot depend on itself.
          if (visibleTasks[next]?.id === drag?.fromTaskId) {
            next += step;
          }
          const task = visibleTasks[next];
          if (!task || !linkTarget) {
            return true;
          }
          setLinkTarget({ taskId: task.id, handle: linkTarget.handle });
          scrollToTask(task.id);
          announce(
            `${task.name}, ${TYPE_LABEL[TYPE_BY_HANDLES[drag!.handle][linkTarget.handle]]}`,
          );
          return true;
        }
        case "ArrowLeft":
        case "ArrowRight": {
          consume();
          if (!linkTarget || !targetTask) {
            return true;
          }
          const handle: ConnectorHandle = e.key === "ArrowLeft" ? "start" : "end";
          setLinkTarget({ taskId: linkTarget.taskId, handle });
          announce(
            `${targetTask.name}, ${TYPE_LABEL[TYPE_BY_HANDLES[drag!.handle][handle]]}`,
          );
          return true;
        }
        case "Enter": {
          consume();
          if (!linkTarget || !drag) {
            return true;
          }
          const verdict = canLink(dependencies, drag.fromTaskId, linkTarget.taskId);
          const name = targetTask?.name ?? String(linkTarget.taskId);
          if (verdict !== "ok") {
            // Refuse loudly and stay in link mode so the user can pick again.
            announce(refusalMessage(verdict, name));
            return true;
          }
          const type = TYPE_BY_HANDLES[drag.handle][linkTarget.handle];
          endDrag(linkTarget.taskId, linkTarget.handle);
          setLinkTarget(null);
          setFocus({ pane: "grid", taskId: drag.fromTaskId, slot: "bar" });
          announce(`Linked to ${name}, ${TYPE_LABEL[type]}`);
          return true;
        }
        default: {
          // Swallow everything else so navigation and nudging can't run while a
          // link is half-built.
          consume();
          return true;
        }
      }
    },
    [
      enabled,
      linking,
      canCreateDependency,
      visibleTasks,
      focusedIndex,
      anchorFor,
      startKeyboardLink,
      setLinkTarget,
      setFocus,
      announce,
      endDrag,
      drag,
      linkTarget,
      targetIndex,
      targetTask,
      dependencies,
      scrollToTask,
    ],
  );
}
