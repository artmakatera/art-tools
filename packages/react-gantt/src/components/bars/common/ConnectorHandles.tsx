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
  barLeft: number;
  barWidth: number;
  barCenterY: number;
  show: boolean;
  slots?: ConnectorHandlesSlots;
  slotProps?: ConnectorHandlesSlotProps;
}

export function ConnectorHandles({
  taskId,
  barLeft,
  barWidth,
  barCenterY,
  show,
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
  };

  const StartHandle = slots?.startHandle ?? "div";
  const EndHandle = slots?.endHandle ?? "div";

  const isVisible = show || isDragging;

  const startHandleProps = mergeSlotProps(
    {
      role: "button",
      tabIndex: 0,
      className: clsx(styles.handle, isVisible && styles.visible),
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
      tabIndex: 0,
      className: clsx(styles.handle, isVisible && styles.visible),
      style: { left: barLeft + barWidth, top: barCenterY - HANDLE_OFFSET },
      onMouseDown: (e: React.MouseEvent) => onMouseDown(e, "end"),
      onMouseUp: (e: React.MouseEvent) => onMouseUp(e, "end"),
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
