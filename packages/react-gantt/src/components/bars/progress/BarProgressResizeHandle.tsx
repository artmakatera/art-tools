import type { ComponentProps, ElementType } from "react";
import { useDrag } from "../../../hooks/useDrag";
import { mergeSlotProps, type SlotConfig, type SlotPropsInput } from "../../../core/slots";
import { useGanttSlots } from "../../../context/GanttSlotsContext";
import styles from "./BarProgress.module.css";

/** State passed to the function form of the BarProgressResizeHandle slotProps. */
export interface BarProgressResizeHandleOwnerState {
  width: number;
  parentWidth: number;
}

export interface BarProgressResizeHandleSlots {
  /** The progress resize handle element. Default: `"div"`. */
  root?: ElementType;
}

export interface BarProgressResizeHandleSlotProps {
  root?: SlotPropsInput<ComponentProps<"div">, BarProgressResizeHandleOwnerState>;
}

export type BarProgressResizeHandleSlotConfig = SlotConfig<
  BarProgressResizeHandleSlots,
  BarProgressResizeHandleSlotProps
>;

type BarProgressResizeHandleProps = {
  width: number;
  onResize: (newWidth: number) => void;
  onResizeEnd?: (newWidth: number) => void;
  parentWidth: number;
  slots?: BarProgressResizeHandleSlots;
  slotProps?: BarProgressResizeHandleSlotProps;
};

export function BarProgressResizeHandle({
  width,
  onResize,
  onResizeEnd,
  parentWidth,
  slots: slotsProp,
  slotProps: slotPropsProp,
}: BarProgressResizeHandleProps) {
  const ganttSlots = useGanttSlots();
  const slots = slotsProp ?? ganttSlots.bars?.barProgressResizeHandle?.slots;
  const slotProps = slotPropsProp ?? ganttSlots.bars?.barProgressResizeHandle?.slotProps;

  const clampWidth = (deltaX: number, startWidth: number) =>
    Math.min(Math.max(0, startWidth + deltaX), parentWidth);

  const onMouseDown = useDrag({
    onStart: () => ({ startWidth: width }),
    onDrag: (deltaX, { startWidth }) => onResize(clampWidth(deltaX, startWidth)),
    onEnd: (deltaX, { startWidth }) => onResizeEnd?.(clampWidth(deltaX, startWidth)),
  });

  const ownerState: BarProgressResizeHandleOwnerState = { width, parentWidth };

  const Root = slots?.root ?? "div";

  const rootProps = mergeSlotProps(
    {
      className: styles.barProgressResizeHandle,
      "aria-hidden": true,
      tabIndex: -1,
      onMouseDown,
    },
    slotProps?.root,
    ownerState,
  );

  return <Root {...rootProps} />;
}
