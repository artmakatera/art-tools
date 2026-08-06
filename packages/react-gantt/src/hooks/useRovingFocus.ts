import { useCallback, useEffect, useRef } from "react";
import type { GanttFocusSlot, GanttPane, GanttTask, Id } from "../types";
import { useGanttFocus, useGanttFocusActions, useGanttScroll } from "../context/GanttContext";
import { pageRowsFor } from "../core/keys";
import type { TreeNodeMeta } from "./useExpand";

interface UseRovingFocusOptions {
  pane: GanttPane;
  /** The element carrying `role="treegrid"`; the focus/blur handlers attach here. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** This pane's own scroller, used to size PageUp/PageDown. */
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  visibleTasks: GanttTask[];
  treeMeta: Map<Id, TreeNodeMeta>;
  rowHeight: number;
  /** The roving stop's slot in this pane: `"row"` in the list, `"bar"` in the grid. */
  defaultSlot: GanttFocusSlot;
  /** Called whenever the cursor lands on a task, for selection + horizontal reveal. */
  onFocusMove?: (task: GanttTask) => void;
}

export interface UseRovingFocusResult {
  /** Index of the cursor in `visibleTasks`, or -1 when it isn't in this pane. */
  focusedIndex: number;
  focusedSlot: GanttFocusSlot;
  moveTo: (index: number, slot?: GanttFocusSlot) => void;
  focusTask: (id: Id, slot?: GanttFocusSlot) => void;
  pageRows: () => number;
  containerProps: {
    tabIndex: -1;
    onFocus: React.FocusEventHandler;
    onBlur: React.FocusEventHandler;
  };
}

/** Slots that act as a roving tab stop, used to resolve a focus event to a row. */
const FOCUSABLE_SLOTS = '[data-gantt-slot="row"], [data-gantt-slot="bar"], [data-gantt-slot="startHandle"], [data-gantt-slot="endHandle"]';

/**
 * Roving-tabindex cursor for one treegrid pane.
 *
 * The cursor is stored as a task id in shared context (see `GanttFocusContext`),
 * never as a DOM node or an index — rows are virtualized and unmount on scroll,
 * and indices shift when a branch collapses.
 *
 * Focus survives virtualization because the pane *pins* the cursor row into its
 * render window (see the `rangeFromOffset` call sites in `TaskList`/`Grid`), so
 * the focused element is mounted for as long as it is the cursor. That removes
 * both failure modes a naive roving tabindex has here: the browser dropping
 * focus to `<body>` when the node unmounts mid-wheel, and the one-commit gap
 * after `scrollToTask` writes `scrollTop` but before the rAF-coalesced viewport
 * measurement re-windows the rows.
 */
export function useRovingFocus({
  pane,
  containerRef,
  scrollerRef,
  visibleTasks,
  treeMeta,
  rowHeight,
  defaultSlot,
  onFocusMove,
}: UseRovingFocusOptions): UseRovingFocusResult {
  const { focus } = useGanttFocus();
  const { setFocus } = useGanttFocusActions();
  const { scrollToTask } = useGanttScroll();

  const isOurs = focus?.pane === pane;
  const focusedSlot = isOurs ? focus.slot : defaultSlot;
  const focusedIndex =
    isOurs ? (treeMeta.get(focus.taskId)?.index ?? -1) : -1;

  // Whether DOM focus is inside this pane. Read by the focus effect so it never
  // steals focus from elsewhere on the page (e.g. on the very first render).
  const paneHasFocusRef = useRef(false);
  // Last position the cursor held, so it can be recovered when its task
  // disappears (deleted, or hidden by collapsing an ancestor).
  const lastIndexRef = useRef(0);
  if (focusedIndex >= 0) {
    lastIndexRef.current = focusedIndex;
  }

  const onFocusMoveRef = useRef(onFocusMove);
  onFocusMoveRef.current = onFocusMove;

  const moveTo = useCallback(
    (index: number, slot?: GanttFocusSlot) => {
      const clamped = Math.max(0, Math.min(index, visibleTasks.length - 1));
      const task = visibleTasks[clamped];
      if (!task) {
        return;
      }
      setFocus({ pane, taskId: task.id, slot: slot ?? defaultSlot });
      scrollToTask(task.id);
      onFocusMoveRef.current?.(task);
    },
    [visibleTasks, setFocus, pane, defaultSlot, scrollToTask],
  );

  const focusTask = useCallback(
    (id: Id, slot?: GanttFocusSlot) => {
      const index = treeMeta.get(id)?.index;
      if (index === undefined) {
        return;
      }
      moveTo(index, slot);
    },
    [treeMeta, moveTo],
  );

  const pageRows = useCallback(
    () => pageRowsFor(scrollerRef.current?.clientHeight ?? 0, rowHeight),
    [scrollerRef, rowHeight],
  );

  // Adopt whatever the browser focused. Covers tabbing in (the fallback stop is
  // whichever row the pane rendered as tabbable) and clicking a bar, so the
  // cursor and DOM focus can never disagree.
  const onFocusEvent = useCallback(
    (e: React.FocusEvent) => {
      paneHasFocusRef.current = true;
      const el = (e.target as HTMLElement).closest<HTMLElement>(FOCUSABLE_SLOTS);
      const rawId = el?.dataset.taskId;
      const slot = el?.dataset.ganttSlot as GanttFocusSlot | undefined;
      if (rawId === undefined || !slot) {
        return;
      }
      // `data-*` stringifies, but Id may be a number — recover the real value.
      const task = visibleTasks.find((t) => String(t.id) === rawId);
      if (!task) {
        return;
      }
      if (isOurs && focus.taskId === task.id && focus.slot === slot) {
        return;
      }
      setFocus({ pane, taskId: task.id, slot });
    },
    [visibleTasks, isOurs, focus, setFocus, pane],
  );

  const onBlurEvent = useCallback((e: React.FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) {
      return; // moving between elements inside this pane
    }
    if (next === null) {
      // Focus went nowhere. Usually that means React just removed the focused
      // row (virtualization churn), not that the user left — so keep the pane
      // marked as focused and let the effect below put focus back. The effect
      // only acts when activeElement is still <body>, so a genuine click on
      // some other control is never overridden.
      return;
    }
    paneHasFocusRef.current = false;
  }, []);

  // The cursor's task can vanish under it — deleted, or hidden by collapsing an
  // ancestor. Land on whatever now occupies that position rather than silently
  // stranding the cursor on a row that no longer exists.
  useEffect(() => {
    if (!isOurs || focusedIndex >= 0) {
      return;
    }
    if (visibleTasks.length === 0) {
      setFocus(null);
      return;
    }
    const next = visibleTasks[Math.min(lastIndexRef.current, visibleTasks.length - 1)];
    if (next) {
      setFocus({ pane, taskId: next.id, slot: defaultSlot });
    }
  }, [isOurs, focusedIndex, visibleTasks, setFocus, pane, defaultSlot]);

  // Put DOM focus where the cursor says it should be.
  //
  // Deliberately runs after every commit rather than on a dep list: pinning
  // keeps the cursor's row rendered, but React can still replace or move the
  // underlying node as the window scrolls past it, and that silently drops
  // focus to <body>. Re-checking each commit repairs it. The work is one
  // querySelector plus an identity test, and it early-returns in the common
  // case where focus is already correct.
  useEffect(() => {
    if (!isOurs || !paneHasFocusRef.current) {
      return;
    }
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const active = document.activeElement;
    // Never yank focus away from a real element elsewhere on the page; only
    // place it, or recover it from the nowhere that an unmount leaves behind.
    if (active !== null && active !== document.body && !container.contains(active)) {
      return;
    }
    const selector = `[data-gantt-slot="${focus.slot}"][data-task-id="${CSS.escape(String(focus.taskId))}"]`;
    const el = container.querySelector<HTMLElement>(selector);
    if (!el || el === active) {
      return;
    }
    // preventScroll is load-bearing: the default focus scroll walks every
    // scrollable ancestor and would fight `scrollOffsetToReveal`, and in the
    // split-pane layout it also drags the absolutely-positioned grid overlay.
    el.focus({ preventScroll: true });
  });

  return {
    focusedIndex,
    focusedSlot,
    moveTo,
    focusTask,
    pageRows,
    containerProps: {
      tabIndex: -1,
      onFocus: onFocusEvent,
      onBlur: onBlurEvent,
    },
  };
}
