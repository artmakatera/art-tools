import type { ComponentProps, ElementType } from "react";
import { mergeSlotProps, type SlotConfig, type SlotPropsInput } from "../../../core/slots";
import { useGanttSlots } from "../../../context/GanttSlotsContext";
import styles from "./BarProgress.module.css";
import { BarProgressResizeHandle } from "./BarProgressResizeHandle";

/** State passed to the function form of each BarProgress slotProps. */
export interface BarProgressOwnerState {
  progress: number;
  width: number;
  height: number;
}

export interface BarProgressSlots {
  /** The progress fill element. Default: `"div"`. */
  root?: ElementType;
}

export interface BarProgressSlotProps {
  root?: SlotPropsInput<ComponentProps<"div">, BarProgressOwnerState>;
}

/** Slot config for the bar progress fill. */
export type BarProgressSlotConfig = SlotConfig<BarProgressSlots, BarProgressSlotProps>;

interface BarProgressProps {
  width: number;
  height: number;
  progress: number;
  onProgressChange?: (newProgress: number) => void;
  onProgressEnd?: (newProgress: number) => void;
  slots?: BarProgressSlots;
  slotProps?: BarProgressSlotProps;
}

export function BarProgress({
  progress,
  width: parentWidth,
  height,
  onProgressChange,
  onProgressEnd,
  slots: slotsProp,
  slotProps: slotPropsProp,
}: BarProgressProps) {
  const ganttSlots = useGanttSlots();
  const slots = slotsProp ?? ganttSlots.bars?.barProgress?.slots;
  const slotProps = slotPropsProp ?? ganttSlots.bars?.barProgress?.slotProps;

  const width = (progress / 100) * parentWidth;
  const toProgress = (newWidth: number) => (newWidth / parentWidth) * 100;

  const ownerState: BarProgressOwnerState = { progress, width, height };

  const Root = slots?.root ?? "div";

  const rootProps = mergeSlotProps(
    { className: styles.barProgress, style: { width, height } },
    slotProps?.root,
    ownerState,
  );

  return (
    <Root {...rootProps}>
      {onProgressChange && (
        <BarProgressResizeHandle
          width={width}
          parentWidth={parentWidth}
          onResize={(newWidth) => onProgressChange(toProgress(newWidth))}
          onResizeEnd={
            onProgressEnd ? (newWidth) => onProgressEnd(toProgress(newWidth)) : undefined
          }
        />
      )}
    </Root>
  );
}
