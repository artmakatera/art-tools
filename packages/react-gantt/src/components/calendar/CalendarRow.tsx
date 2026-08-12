import { clsx } from "clsx";
import type { ComponentProps, ElementType } from "react";
import { isWeekend, periodKey } from "../../core/dateUtils";
import { formatPeriodLabel } from "../../core/labels";
import type { Scale } from "../../types";
import type { IndexRange } from "../../core/virtualize";
import { mergeSlotProps, type SlotConfig, type SlotPropsInput } from "../../core/slots";
import { useGanttSlots } from "../../context/GanttSlotsContext";
import styles from "./Calendar.module.css";

/** State passed to the function form of the CalendarRow `row` slotProps. */
export interface CalendarRowOwnerState {
  scale: Scale;
  colWidth: number;
  rowHeight: number;
  highlightWeekends: boolean;
}

/** State passed to the function form of the CalendarRow `cell` slotProps (per group). */
export interface CalendarCellOwnerState {
  scale: Scale;
  /** Start date of the group this cell represents. */
  date: Date;
  /** Index of the group's first date column. */
  startIndex: number;
  /** Number of date columns the group spans. */
  count: number;
  isWeekend: boolean;
  colWidth: number;
}

export interface CalendarRowSlots {
  /** The row container. Default: `"div"`. */
  row?: ElementType;
  /** A per-group header cell. Default: `"div"`. */
  cell?: ElementType;
}

export interface CalendarRowSlotProps {
  row?: SlotPropsInput<ComponentProps<"div">, CalendarRowOwnerState>;
  cell?: SlotPropsInput<ComponentProps<"div">, CalendarCellOwnerState>;
}

/**
 * Slot config for a calendar (header) row. Pass via the calendar's slot props.
 *
 * NOTE: pass a referentially stable / memoized object so downstream memoization
 * is not defeated by a fresh object each render.
 */
export type CalendarRowSlotConfig = SlotConfig<CalendarRowSlots, CalendarRowSlotProps>;

type CalendarRowProps = {
  scale: Scale;
  dates: Date[];
  colWidth: number;
  rowHeight: number;
  highlightWeekends?: boolean;
  /**
   * Half-open range of date indices in view (virtualization window).
   * When omitted, every group is rendered.
   */
  colRange?: IndexRange;
  /** 1-based row number within the enclosing grid, for `aria-rowindex`. */
  rowIndex?: number;
  slots?: CalendarRowSlots;
  slotProps?: CalendarRowSlotProps;
};

interface Group {
  key: string;
  start: Date;
  /** Index of the group's first date column, for absolute positioning. */
  startIndex: number;
  count: number;
}

function groupDates(dates: Date[], scale: Scale): Group[] {
  const groups: Group[] = [];
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]!;
    const key = periodKey(date, scale.unit, scale.step);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.count += 1;
    } else {
      groups.push({ key, start: date, startIndex: i, count: 1 });
    }
  }
  return groups;
}

export function CalendarRow({
  scale,
  dates,
  colWidth,
  rowHeight,
  highlightWeekends = false,
  colRange,
  rowIndex,
  slots: slotsProp,
  slotProps: slotPropsProp,
}: CalendarRowProps) {
  const ganttSlots = useGanttSlots();
  const slots = slotsProp ?? ganttSlots.timeline?.calendarRow?.slots;
  const slotProps = slotPropsProp ?? ganttSlots.timeline?.calendarRow?.slotProps;

  const groups = groupDates(dates, scale);

  const Row = slots?.row ?? "div";
  const Cell = slots?.cell ?? "div";

  const rowOwnerState: CalendarRowOwnerState = {
    scale,
    colWidth,
    rowHeight,
    highlightWeekends,
  };

  const rowProps = mergeSlotProps(
    {
      className: styles.row,
      style: { height: rowHeight },
      role: "row",
      "aria-rowindex": rowIndex,
    },
    slotProps?.row,
    rowOwnerState,
  );

  return (
    <Row {...rowProps}>
      {groups.map((group) => {
        if (
          colRange &&
          (group.startIndex >= colRange.end ||
            group.startIndex + group.count <= colRange.start)
        ) {
          return null;
        }
        const weekend = highlightWeekends && isWeekend(group.start);
        const cellOwnerState: CalendarCellOwnerState = {
          scale,
          date: group.start,
          startIndex: group.startIndex,
          count: group.count,
          isWeekend: weekend,
          colWidth,
        };

        const cellProps = mergeSlotProps(
          {
            className: clsx(styles.cell, weekend && styles.cellWeekend),
            style: {
              left: group.startIndex * colWidth,
              width: group.count * colWidth,
            },
            children: scale.format(group.start),
            role: "columnheader",
            "aria-colindex": group.startIndex + 1,
            "aria-colspan": group.count,
            "aria-label": scale.ariaFormat
              ? scale.ariaFormat(group.start)
              : formatPeriodLabel(group.start, scale.unit, scale.step),
          },
          slotProps?.cell,
          cellOwnerState,
        );
        return <Cell key={group.key} {...cellProps} />;
      })}
    </Row>
  );
}
