import type { ComponentProps, ElementType } from "react";
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
  slots: slotsProp,
  slotProps: slotPropsProp,
}: MilestoneBarProps) {
  const ganttSlots = useGanttSlots();
  const slots = slotsProp ?? ganttSlots.bars?.milestoneBar?.slots;
  const slotProps = slotPropsProp ?? ganttSlots.bars?.milestoneBar?.slotProps;

  const ownerState: MilestoneBarOwnerState = { size, title };

  const Root = slots?.root ?? DraggableBar;
  const Shape = slots?.shape ?? "div";

  const rootProps = mergeSlotProps(
    { className: styles.milestone, title, ...a11y },
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
