import { clsx } from "clsx";
import type { ComponentProps, ElementType, MouseEvent, ReactNode } from "react";
import { unitOffset } from "../../../core/dateUtils";
import { BASELINE_LINE_HEIGHT } from "../../../core/baselines";
import { displayEndDate } from "../../../core/taskDates";
import { mergeSlotProps, type SlotConfig, type SlotPropsInput } from "../../../core/slots";
import { useGanttSlots } from "../../../context/GanttSlotsContext";
import type { CalendarUnit, GanttBaseline, GanttTask } from "../../../types";
import styles from "./Baseline.module.css";

// Reusing one formatter reduced the 1k-task / five-baseline SSR benchmark mean
// from ~275ms to ~74ms; constructing one per line dominated the render.
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function baselineDescription(task: GanttTask, baseline: GanttBaseline): string {
  const name = baseline.title ?? String(baseline.id);
  const start = formatDate(baseline.startDate);
  if (task.type === "milestone") {
    return `${name}: ${start}`;
  }
  const end = formatDate(displayEndDate(baseline.startDate, baseline.endDate!));
  return `${name}: ${start} – ${end}`;
}

export interface BaselineOwnerState {
  task: GanttTask;
  baseline: GanttBaseline;
  index: number;
  left: number;
  width: number;
  displayEnd?: Date;
}

export interface BaselineSlots {
  /** Visual root. */
  root?: ElementType;
  /** Optional wrapper for a custom tooltip; receives the baseline data and root as `children`. */
  tooltip?: ElementType;
}

export interface BaselineTooltipProps extends BaselineOwnerState {
  children: ReactNode;
}

export interface BaselineSlotProps {
  root?: SlotPropsInput<ComponentProps<"div">, BaselineOwnerState>;
}

export type BaselineSlotConfig = SlotConfig<BaselineSlots, BaselineSlotProps>;

interface BaselineProps {
  task: GanttTask;
  baseline: GanttBaseline;
  index: number;
  origin: Date;
  colWidth: number;
  unit: CalendarUnit;
  top: number;
  description: string;
}

export function Baseline({
  task,
  baseline,
  index,
  origin,
  colWidth,
  unit,
  top,
  description,
}: BaselineProps) {
  const config = useGanttSlots().bars?.baseline;
  const milestone = task.type === "milestone";
  const start = unitOffset(origin, baseline.startDate, unit) * colWidth;
  const end = milestone ? start : unitOffset(origin, baseline.endDate!, unit) * colWidth;
  const left = milestone ? start - BASELINE_LINE_HEIGHT / 2 : start;
  const width = milestone ? BASELINE_LINE_HEIGHT : end - start;
  const displayEnd = milestone ? undefined : displayEndDate(baseline.startDate, baseline.endDate!);
  const ownerState: BaselineOwnerState = { task, baseline, index, left, width, displayEnd };
  const Root = config?.slots?.root ?? "div";
  const Tooltip = config?.slots?.tooltip;
  const rootProps = mergeSlotProps(
    {
      className: clsx(styles.baseline, "am-gantt-baseline", milestone && styles.milestone),
      style: { left, top, width, height: BASELINE_LINE_HEIGHT },
      title: Tooltip ? undefined : description,
      "aria-hidden": true,
      onClick: (event: MouseEvent<HTMLDivElement>) => event.stopPropagation(),
    },
    config?.slotProps?.root,
    ownerState,
  );

  // Slot callbacks may replace the default click handler, but a baseline must
  // never select the parent row (ADR-025).
  const root = (
    <Root
      {...rootProps}
      onClick={(event: MouseEvent<HTMLDivElement>) => {
        rootProps.onClick?.(event);
        event.stopPropagation();
      }}
    />
  );
  return Tooltip ? <Tooltip {...ownerState}>{root}</Tooltip> : root;
}
