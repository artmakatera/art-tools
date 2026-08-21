import clsx from "clsx";
import type { ComponentProps, ElementType } from "react";
import { useDrag } from "../../../hooks/useDrag";
import { mergeSlotProps, type SlotConfig, type SlotPropsInput } from "../../../core/slots";
import { useGanttSlots } from "../../../context/GanttSlotsContext";
import styles from "./TaskBar.module.css";

/** State passed to the function form of each TaskResizer slotProps. */
export interface TaskResizerOwnerState {
  width: number;
  left: number;
}

export interface TaskResizerSlots {
  /** The left/start resize button. Default: `"button"`. */
  startHandle?: ElementType;
  /** The right/end resize button. Default: `"button"`. */
  endHandle?: ElementType;
}

export interface TaskResizerSlotProps {
  startHandle?: SlotPropsInput<ComponentProps<"button">, TaskResizerOwnerState>;
  endHandle?: SlotPropsInput<ComponentProps<"button">, TaskResizerOwnerState>;
}

export type TaskResizerSlotConfig = SlotConfig<TaskResizerSlots, TaskResizerSlotProps>;

interface TaskResizerProps {
  width: number;
  left: number;
  colWidth: number;
  onResize: (newWidth: number, newLeft: number) => void;
  /**
   * Fired on release with ONLY the edge the user dragged, as an absolute pixel
   * position. The opposite edge is deliberately not reported: snapping both
   * independently is what used to let a start-handle drag shift the far edge by a
   * whole column.
   */
  onResizeEnd: (edge: "start" | "end", edgePx: number) => void;
  slots?: TaskResizerSlots;
  slotProps?: TaskResizerSlotProps;
}

export function TaskResizer({
  width,
  left,
  colWidth,
  onResize,
  onResizeEnd,
  slots: slotsProp,
  slotProps: slotPropsProp,
}: TaskResizerProps) {
  const ganttSlots = useGanttSlots();
  const slots = slotsProp ?? ganttSlots.bars?.taskResizer?.slots;
  const slotProps = slotPropsProp ?? ganttSlots.bars?.taskResizer?.slotProps;

  const onStartHandleMouseDown = useDrag({
    onStart: () => ({ startWidth: width, startLeft: left }),
    onDrag: (deltaX, { startWidth, startLeft }) => {
      const clampedDelta = Math.min(deltaX, startWidth);
      const newWidth = startWidth - clampedDelta;
      const newLeft = startLeft + clampedDelta;
      onResize(newWidth, newLeft);
    },
    onEnd: (deltaX, { startWidth, startLeft }) => {
      const clampedDelta = Math.min(deltaX, startWidth);
      const rawLeft = startLeft + clampedDelta;
      onResizeEnd("start", Math.round(rawLeft / colWidth) * colWidth);
    },
  });

  const onEndHandleMouseDown = useDrag({
    onStart: () => ({ startWidth: width, startLeft: left }),
    onDrag: (deltaX, { startWidth, startLeft }) => {
      const newWidth = Math.max(0, startWidth + deltaX);
      onResize(newWidth, startLeft);
    },
    onEnd: (deltaX, { startWidth, startLeft }) => {
      const rawRight = startLeft + Math.max(0, startWidth + deltaX);
      onResizeEnd("end", Math.round(rawRight / colWidth) * colWidth);
    },
  });

  const ownerState: TaskResizerOwnerState = { width, left };

  const StartHandle = slots?.startHandle ?? "button";
  const EndHandle = slots?.endHandle ?? "button";

  const startHandleProps = mergeSlotProps(
    {
      type: "button" as const,
      "aria-hidden": true,
      tabIndex: -1,
      className: clsx(styles.resizer, styles.startResizer),
      onMouseDown: onStartHandleMouseDown,
    },
    slotProps?.startHandle,
    ownerState,
  );

  const endHandleProps = mergeSlotProps(
    {
      type: "button" as const,
      "aria-hidden": true,
      tabIndex: -1,
      className: clsx(styles.resizer, styles.endResizer),
      onMouseDown: onEndHandleMouseDown,
    },
    slotProps?.endHandle,
    ownerState,
  );

  return (
    <>
      <StartHandle {...startHandleProps} />
      <EndHandle {...endHandleProps} />
    </>
  );
}
