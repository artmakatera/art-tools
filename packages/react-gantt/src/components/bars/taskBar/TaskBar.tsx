import type { ComponentProps, ElementType } from "react";
import { mergeSlotProps, type SlotConfig, type SlotPropsInput } from "../../../core/slots";
import { useGanttSlots } from "../../../context/GanttSlotsContext";
import { DraggableBar, type BarA11yProps } from "../common/DraggableBar";
import { BarProgress } from "../progress/BarProgress";
import styles from "./TaskBar.module.css";
import { TaskResizer } from "./TaskResizer";

/** State passed to the function form of each TaskBar slotProps. */
export interface TaskBarOwnerState {
  width: number;
  height: number;
  progress: number;
  title: string;
}

export interface TaskBarSlots {
  /** The draggable bar wrapper. Default: `DraggableBar`. */
  root?: ElementType;
  /** The inner layout wrapper holding progress/label/resizer. Default: `"div"`. */
  inner?: ElementType;
  /** The title label. Default: `"div"`. */
  label?: ElementType;
}

export interface TaskBarSlotProps {
  root?: SlotPropsInput<ComponentProps<"div">, TaskBarOwnerState>;
  inner?: SlotPropsInput<ComponentProps<"div">, TaskBarOwnerState>;
  label?: SlotPropsInput<ComponentProps<"div">, TaskBarOwnerState>;
}

/** Slot config for the task bar. */
export type TaskBarSlotConfig = SlotConfig<TaskBarSlots, TaskBarSlotProps>;

interface TaskBarProps {
  width: number;
  height: number;
  left: number;
  top: number;
  colWidth: number;
  title: string;
  a11y?: BarA11yProps;
  progress: number;
  onProgressChange: (newProgress: number) => void;
  onProgressEnd: (newProgress: number) => void;
  onResize: (newWidth: number, newLeft: number) => void;
  onResizeEnd: (edge: "start" | "end", edgePx: number) => void;
  onMove: (newLeft: number) => void;
  onMoveEnd: (newLeft: number) => void;
  slots?: TaskBarSlots;
  slotProps?: TaskBarSlotProps;
}

export function TaskBar({
  width,
  height,
  left,
  top,
  colWidth,
  title,
  a11y,
  progress = 30,
  onProgressChange,
  onProgressEnd,
  onResize,
  onResizeEnd,
  onMove,
  onMoveEnd,
  slots: slotsProp,
  slotProps: slotPropsProp,
}: TaskBarProps) {
  const ganttSlots = useGanttSlots();
  const slots = slotsProp ?? ganttSlots.bars?.taskBar?.slots;
  const slotProps = slotPropsProp ?? ganttSlots.bars?.taskBar?.slotProps;

  const ownerState: TaskBarOwnerState = { width, height, progress, title };

  const Root = slots?.root ?? DraggableBar;
  const Inner = slots?.inner ?? "div";
  const Label = slots?.label ?? "div";

  const rootProps = mergeSlotProps(
    {
      className: `${styles.task} am-gantt-bar-task`,
      style: { lineHeight: `${height}px` },
      ...a11y,
    },
    slotProps?.root,
    ownerState,
  );

  const innerProps = mergeSlotProps(
    { className: styles.taskInner, "aria-hidden": true },
    slotProps?.inner,
    ownerState,
  );

  const labelProps = mergeSlotProps(
    { className: styles.taskContent, title, children: title },
    slotProps?.label,
    ownerState,
  );

  return (
    <Root
      left={left}
      top={top}
      width={width}
      height={height}
      colWidth={colWidth}
      dragAnchor={left}
      onMove={onMove}
      onMoveEnd={onMoveEnd}
      {...rootProps}
    >
      <Inner {...innerProps}>
        <BarProgress
          width={width}
          height={height}
          progress={progress}
          onProgressChange={onProgressChange}
          onProgressEnd={onProgressEnd}
        />
        <Label {...labelProps} />
        <TaskResizer
          width={width}
          left={left}
          colWidth={colWidth}
          onResize={onResize}
          onResizeEnd={onResizeEnd}
        />
      </Inner>
    </Root>
  );
}
