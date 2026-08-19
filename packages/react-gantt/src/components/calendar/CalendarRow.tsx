import { clsx } from "clsx";
import { useMemo, type ComponentProps, type ElementType } from "react";
import { addUnit, isWeekend, periodKey } from "../../core/dateUtils";
import { nonWorkingInfo, type NonWorkingReason } from "../../core/workingTime";
import { useGanttWorkCalendar } from "../../context/contexts";
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
  /**
   * Whether the calendar excludes this cell from working time. Prefer this over
   * {@link CalendarCellOwnerState.isWeekend} — it also covers holidays.
   */
  isNonWorking: boolean;
  /** Why the cell is non-working, for styling weekends and holidays apart. */
  nonWorkingReason?: NonWorkingReason;
  /**
   * @deprecated Use {@link CalendarCellOwnerState.isNonWorking}. Retained as an
   * alias so existing slot code keeps working.
   */
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

/**
 * Half-open slice of `groups` overlapping `colRange`. Groups tile the date axis
 * in order and without gaps, so the first visible one is a binary search away
 * and the last is a short walk from there — no pass over the full list, which
 * at day scale is one entry per rendered date.
 */
function groupRange(groups: Group[], colRange: IndexRange | undefined): IndexRange {
  if (!colRange) {
    return { start: 0, end: groups.length };
  }
  let lo = 0;
  let hi = groups.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const group = groups[mid]!;
    if (group.startIndex + group.count <= colRange.start) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  let end = lo;
  while (end < groups.length && groups[end]!.startIndex < colRange.end) {
    end += 1;
  }
  return { start: lo, end };
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
  const { calendar } = useGanttWorkCalendar();
  const slotProps = slotPropsProp ?? ganttSlots.timeline?.calendarRow?.slotProps;

  // Grouping walks every date, so it must not ride along with the scroll frames
  // that change `colRange`: `dates` only changes when the task range or zoom
  // level does.
  const groups = useMemo(() => groupDates(dates, scale), [dates, scale]);
  const visible = groupRange(groups, colRange);

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
      {groups.slice(visible.start, visible.end).map((group) => {
        const info =
          highlightWeekends && calendar
            ? nonWorkingInfo(calendar, group.start, addUnit(group.start, scale.unit, scale.step))
            : { isNonWorking: false, reason: undefined };
        // With no calendar, keep the historical Sat/Sun-only behaviour exactly.
        const nonWorking = calendar
          ? info.isNonWorking
          : highlightWeekends && isWeekend(group.start);
        const cellOwnerState: CalendarCellOwnerState = {
          scale,
          date: group.start,
          startIndex: group.startIndex,
          count: group.count,
          isNonWorking: nonWorking,
          nonWorkingReason: nonWorking ? (info.reason ?? "weekend") : undefined,
          isWeekend: nonWorking,
          colWidth,
        };

        const cellProps = mergeSlotProps(
          {
            className: clsx(styles.cell, nonWorking && styles.cellWeekend),
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
