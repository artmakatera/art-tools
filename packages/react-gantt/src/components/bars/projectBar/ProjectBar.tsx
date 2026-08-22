import type { ComponentProps, ElementType, Ref } from "react";
import { mergeSlotProps, type SlotConfig, type SlotPropsInput } from "../../../core/slots";
import { useGanttSlots } from "../../../context/GanttSlotsContext";
import { DraggableBar, type BarA11yProps } from "../common/DraggableBar";
import { BarProgress } from "../progress/BarProgress";
import styles from "./ProjectBar.module.css";

/** State passed to the function form of each ProjectBar slotProps. */
export interface ProjectBarOwnerState {
  width: number;
  height: number;
  progress: number;
  title: string;
}

export interface ProjectBarSlots {
  /** The draggable bar wrapper. Default: `DraggableBar`. */
  root?: ElementType;
  /** The inner layout wrapper holding progress/label. Default: `"div"`. */
  inner?: ElementType;
  /** The title label. Default: `"div"`. */
  label?: ElementType;
}

export interface ProjectBarSlotProps {
  root?: SlotPropsInput<ComponentProps<"div">, ProjectBarOwnerState>;
  inner?: SlotPropsInput<ComponentProps<"div">, ProjectBarOwnerState>;
  label?: SlotPropsInput<ComponentProps<"div">, ProjectBarOwnerState>;
}

/** Slot config for the project bar. */
export type ProjectBarSlotConfig = SlotConfig<ProjectBarSlots, ProjectBarSlotProps>;

interface ProjectBarProps {
  width: number;
  height: number;
  left: number;
  top: number;
  colWidth: number;
  title: string;
  a11y?: BarA11yProps;
  progress: number;
  /** Editing handlers; omitted on a read-only chart (see `TaskBar`). */
  onProgressChange?: (newProgress: number) => void;
  onProgressEnd?: (newProgress: number) => void;
  onMove?: (newLeft: number) => void;
  onMoveEnd?: (newLeft: number) => void;
  /** Forwarded to the root element, for a tooltip slot to anchor against. */
  barRef?: Ref<HTMLDivElement>;
  slots?: ProjectBarSlots;
  slotProps?: ProjectBarSlotProps;
}

export function ProjectBar({
  width,
  height,
  left,
  top,
  colWidth,
  title,
  a11y,
  progress,
  onProgressChange,
  onProgressEnd,
  onMove,
  onMoveEnd,
  barRef,
  slots: slotsProp,
  slotProps: slotPropsProp,
}: ProjectBarProps) {
  const ganttSlots = useGanttSlots();
  const slots = slotsProp ?? ganttSlots.bars?.projectBar?.slots;
  const slotProps = slotPropsProp ?? ganttSlots.bars?.projectBar?.slotProps;

  const ownerState: ProjectBarOwnerState = { width, height, progress, title };

  const Root = slots?.root ?? DraggableBar;
  const Inner = slots?.inner ?? "div";
  const Label = slots?.label ?? "div";

  const rootProps = mergeSlotProps(
    {
      className: styles.project,
      style: { lineHeight: `${height}px` },
      ...a11y,
    },
    slotProps?.root,
    ownerState,
  );

  const innerProps = mergeSlotProps(
    { className: styles.projectInner, "aria-hidden": true },
    slotProps?.inner,
    ownerState,
  );

  const labelProps = mergeSlotProps(
    { className: styles.projectContent, children: title },
    slotProps?.label,
    ownerState,
  );

  return (
    <Root
      ref={barRef}
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
      </Inner>
    </Root>
  );
}
