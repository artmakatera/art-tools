import { clsx } from "clsx";
import type { ComponentProps, ElementType } from "react";
import {
  useGanttDependency,
  useGanttDragActive,
  useGanttScroll,
  type ConnectorHandle,
} from "../../../context/GanttContext";
import { CONNECTOR_HANDLE_SIZE } from "../../../core/constants";
import { mergeSlotProps, type SlotConfig, type SlotPropsInput } from "../../../core/slots";
import { useGanttSlots } from "../../../context/GanttSlotsContext";
import type { Id } from "../../../types";
import styles from "./ConnectorHandles.module.css";

const HANDLE_OFFSET = CONNECTOR_HANDLE_SIZE / 2;

/** State passed to the function form of each ConnectorHandles slotProps. */
export interface ConnectorHandlesOwnerState {
  taskId: Id;
  barLeft: number;
  barWidth: number;
  barCenterY: number;
  show: boolean;
  isDragging: boolean;
  /** This handle is the source of an in-progress keyboard link. */
  focusedHandle: ConnectorHandle | null;
  /** This handle is the prospective target of an in-progress keyboard link. */
  linkTargetHandle: ConnectorHandle | null;
}

export interface ConnectorHandlesSlots {
  /** The left/start dependency-connector handle. Default: `"div"`. */
  startHandle?: ElementType;
  /** The right/end dependency-connector handle. Default: `"div"`. */
  endHandle?: ElementType;
}

export interface ConnectorHandlesSlotProps {
  startHandle?: SlotPropsInput<ComponentProps<"div">, ConnectorHandlesOwnerState>;
  endHandle?: SlotPropsInput<ComponentProps<"div">, ConnectorHandlesOwnerState>;
}

export type ConnectorHandlesSlotConfig = SlotConfig<
  ConnectorHandlesSlots,
  ConnectorHandlesSlotProps
>;

interface ConnectorHandlesProps {
  taskId: Id;
  /**
   * Qualifies the handles' accessible names. Optional so the component stays
   * renderable standalone; omitting it yields the unqualified "Link from start".
   */
  taskName?: string;
  barLeft: number;
  barWidth: number;
  barCenterY: number;
  show: boolean;
  focusedHandle?: ConnectorHandle | null;
  linkTargetHandle?: ConnectorHandle | null;
  slots?: ConnectorHandlesSlots;
  slotProps?: ConnectorHandlesSlotProps;
}

export function ConnectorHandles({
  taskId,
  taskName,
  barLeft,
  barWidth,
  barCenterY,
  show,
  focusedHandle = null,
  linkTargetHandle = null,
  slots: slotsProp,
  slotProps: slotPropsProp,
}: ConnectorHandlesProps) {
  const ganttSlots = useGanttSlots();
  const slots = slotsProp ?? ganttSlots.bars?.connectorHandles?.slots;
  const slotProps = slotPropsProp ?? ganttSlots.bars?.connectorHandles?.slotProps;

  const { startDrag, endDrag } = useGanttDependency();
  const isDragging = useGanttDragActive();
  const { gridBodyRef } = useGanttScroll();

  const getStartCoords = (e: React.MouseEvent, _handle: ConnectorHandle) => {
    const rect = gridBodyRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }
    const handleEl = e.currentTarget as HTMLElement;
    const hRect = handleEl.getBoundingClientRect();
    return {
      x: hRect.left + hRect.width / 2 - rect.left,
      y: hRect.top + hRect.height / 2 - rect.top,
    };
  };

  const onMouseDown = (e: React.MouseEvent, handle: ConnectorHandle) => {
    e.stopPropagation();
    e.preventDefault();
    const { x, y } = getStartCoords(e, handle);
    startDrag({ fromTaskId: taskId, handle, startX: x, startY: y, currentX: x, currentY: y });
  };

  const onMouseUp = (e: React.MouseEvent, handle: ConnectorHandle) => {
    if (isDragging) {
      e.stopPropagation();
      endDrag(taskId, handle);
    }
  };

  const ownerState: ConnectorHandlesOwnerState = {
    taskId,
    barLeft,
    barWidth,
    barCenterY,
    show,
    isDragging,
    focusedHandle,
    linkTargetHandle,
  };

  const StartHandle = slots?.startHandle ?? "div";
  const EndHandle = slots?.endHandle ?? "div";

  // Handles are invisible until their row is hovered, so a keyboard user needs
  // them forced visible while a link involves them.
  const isVisible =
    show || isDragging || focusedHandle !== null || linkTargetHandle !== null;

  const startHandleProps = mergeSlotProps(
    {
      role: "button",
      // Not a tab stop: with one handle pair per bar this contributed two dead
      // stops per row. The keyboard link flow makes the handle the roving stop
      // for exactly as long as a link is being drawn.
      // Becomes the roving stop for exactly as long as it is the source of a
      // keyboard link; otherwise it stays out of the tab order.
      tabIndex: focusedHandle === "start" ? 0 : -1,
      "aria-label": taskName ? `Link from start of ${taskName}` : "Link from start",
      className: clsx(
        styles.handle,
        isVisible && styles.visible,
        linkTargetHandle === "start" && styles.target,
      ),
      style: { left: barLeft - CONNECTOR_HANDLE_SIZE, top: barCenterY - HANDLE_OFFSET },
      onMouseDown: (e: React.MouseEvent) => onMouseDown(e, "start"),
      onMouseUp: (e: React.MouseEvent) => onMouseUp(e, "start"),
    },
    slotProps?.startHandle,
    ownerState,
  );

  const endHandleProps = mergeSlotProps(
    {
      role: "button",
      tabIndex: focusedHandle === "end" ? 0 : -1,
      "aria-label": taskName ? `Link from end of ${taskName}` : "Link from end",
      className: clsx(
        styles.handle,
        isVisible && styles.visible,
        linkTargetHandle === "end" && styles.target,
      ),
      style: { left: barLeft + barWidth, top: barCenterY - HANDLE_OFFSET },
      onMouseDown: (e: React.MouseEvent) => onMouseDown(e, "end"),
      onMouseUp: (e: React.MouseEvent) => onMouseUp(e, "end"),
    },
    slotProps?.endHandle,
    ownerState,
  );

  // The data-* hooks go after the spread on purpose: they are how the roving
  // focus effect finds a handle, so consumer slotProps must not displace them.
  return (
    <>
      <StartHandle {...startHandleProps} data-task-id={taskId} data-gantt-slot="startHandle" />
      <EndHandle {...endHandleProps} data-task-id={taskId} data-gantt-slot="endHandle" />
    </>
  );
}
