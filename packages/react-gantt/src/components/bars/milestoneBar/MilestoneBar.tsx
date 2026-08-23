import type { ComponentProps, ElementType, Ref } from "react";
import { mergeSlotProps, type SlotConfig, type SlotPropsInput } from "../../../core/slots";
import { useGanttSlots } from "../../../context/GanttSlotsContext";
import { DraggableBar, type BarA11yProps } from "../common/DraggableBar";
import styles from "./MilestoneBar.module.css";

export interface MilestoneBarOwnerState {
  size: number;
  title: string;
}

export interface MilestoneBarSlots {
  /** The draggable bar wrapper. Default: `DraggableBar`. */
  root?: ElementType;
  /** The diamond shape. Default: `"div"`. */
  shape?: ElementType;
}

export interface MilestoneBarSlotProps {
  root?: SlotPropsInput<ComponentProps<"div">, MilestoneBarOwnerState>;
  shape?: SlotPropsInput<ComponentProps<"div">, MilestoneBarOwnerState>;
}

export type MilestoneBarSlotConfig = SlotConfig<MilestoneBarSlots, MilestoneBarSlotProps>;

interface MilestoneBarProps {
  size: number;
  centerLeft: number;
  top: number;
  colWidth: number;
  title: string;
  a11y?: BarA11yProps;
  /** Editing handlers; omitted on a read-only chart (see `TaskBar`). */
  onMove?: (newCenterLeft: number) => void;
  onMoveEnd?: (newCenterLeft: number) => void;
  /** Forwarded to the root element, for a tooltip slot to anchor against. */
  barRef?: Ref<HTMLDivElement>;
  /**
   * Hover handlers for the root element. The tooltip triggers on the bar rather
   * than on its row, which spans the whole timeline width — a row-level trigger
   * fires over empty space far from the task (ADR-022).
   */
  hoverProps?: Pick<ComponentProps<"div">, "onMouseEnter" | "onMouseLeave">;
  slots?: MilestoneBarSlots;
  slotProps?: MilestoneBarSlotProps;
}

export function MilestoneBar({
  size,
  centerLeft,
  top,
  colWidth,
  title,
  a11y,
  onMove,
  onMoveEnd,
  barRef,
  hoverProps,
  slots: slotsProp,
  slotProps: slotPropsProp,
}: MilestoneBarProps) {
  const ganttSlots = useGanttSlots();
  const slots = slotsProp ?? ganttSlots.bars?.milestoneBar?.slots;
  const slotProps = slotPropsProp ?? ganttSlots.bars?.milestoneBar?.slotProps;

  const ownerState: MilestoneBarOwnerState = { size, title };

  const Root = slots?.root ?? DraggableBar;
  const Shape = slots?.shape ?? "div";

  // When `a11y` is supplied it owns the native tooltip, including deliberately
  // omitting it under a tooltip slot. The `title` prop is only the fallback for
  // standalone use of this component outside a chart.
  const rootProps = mergeSlotProps(
    { className: styles.milestone, ...a11y, ...hoverProps, title: a11y ? a11y.title : title },
    slotProps?.root,
    ownerState,
  );

  const shapeProps = mergeSlotProps(
    { className: styles.milestoneShape, "aria-hidden": true },
    slotProps?.shape,
    ownerState,
  );

  return (
    <Root
      ref={barRef}
      left={centerLeft - size / 2}
      top={top}
      width={size}
      height={size}
      colWidth={colWidth}
      dragAnchor={centerLeft}
      onMove={onMove}
      onMoveEnd={onMoveEnd}
      {...rootProps}
    >
      <Shape {...shapeProps} />
    </Root>
  );
}
