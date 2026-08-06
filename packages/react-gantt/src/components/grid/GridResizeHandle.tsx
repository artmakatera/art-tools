import type { ComponentProps, ElementType } from "react";
import { mergeSlotProps, type SlotConfig, type SlotPropsInput } from "../../core/slots";
import { useGanttSlots } from "../../context/GanttSlotsContext";
import styles from "./GridResizeHandle.module.css";

/** State passed to the function form of the GridResizeHandle slotProps. */
export interface GridResizeHandleOwnerState {
  /** Whether a resize drag is currently in progress. */
  isResizing: boolean;
}

export interface GridResizeHandleSlots {
  /** The pane splitter element. Default: `"div"`. */
  root?: ElementType;
}

export interface GridResizeHandleSlotProps {
  root?: SlotPropsInput<ComponentProps<"div">, GridResizeHandleOwnerState>;
}

export type GridResizeHandleSlotConfig = SlotConfig<
  GridResizeHandleSlots,
  GridResizeHandleSlotProps
>;

interface GridResizeHandleProps {
  onMouseDown: React.MouseEventHandler;
  isResizing?: boolean;
  slots?: GridResizeHandleSlots;
  slotProps?: GridResizeHandleSlotProps;
}

export function GridResizeHandle({
  onMouseDown,
  isResizing = false,
  slots: slotsProp,
  slotProps: slotPropsProp,
}: GridResizeHandleProps) {
  const ganttSlots = useGanttSlots();
  const slots = slotsProp ?? ganttSlots.timeline?.gridResizeHandle?.slots;
  const slotProps = slotPropsProp ?? ganttSlots.timeline?.gridResizeHandle?.slotProps;

  const ownerState: GridResizeHandleOwnerState = { isResizing };

  const Root = slots?.root ?? "div";

  const rootProps = mergeSlotProps(
    {
      className: styles.handle,
      onMouseDown,
      role: "separator",
      "aria-orientation": "vertical" as const,
      "aria-label": "Resize task list",
    },
    slotProps?.root,
    ownerState,
  );

  return <Root {...rootProps} />;
}
