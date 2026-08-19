import { clsx } from "clsx";
import type { ComponentProps, ElementType } from "react";
import { addUnit, isWeekend } from "../../core/dateUtils";
import { nonWorkingInfo, type NonWorkingReason } from "../../core/workingTime";
import { useGanttWorkCalendar } from "../../context/GanttContext";
import type { CalendarUnit } from "../../types";
import type { IndexRange } from "../../core/virtualize";
import { mergeSlotProps, type SlotConfig, type SlotPropsInput } from "../../core/slots";
import { useGanttSlots } from "../../context/GanttSlotsContext";
import styles from "./GridColumns.module.css";

/** State passed to the function form of the GridColumns `column` slotProps (per day). */
export interface GridColumnOwnerState {
  /** The day this column paints. */
  date: Date;
  /** Absolute date-column index. */
  index: number;
  /**
   * Whether the calendar excludes this column from working time. Prefer this over
   * {@link GridColumnOwnerState.isWeekend} — it also covers holidays and, at hour
   * scale, off-hours.
   */
  isNonWorking: boolean;
  /** Why the column is non-working, for styling weekends and holidays apart. */
  nonWorkingReason?: NonWorkingReason;
  /**
   * @deprecated Use {@link GridColumnOwnerState.isNonWorking}. Retained as an
   * alias so existing slot code keeps working; it is now true for any
   * non-working column, not only Saturday and Sunday.
   */
  isWeekend: boolean;
  colWidth: number;
  bodyHeight: number;
}

export interface GridColumnsSlots {
  /** A per-day background column. Default: `"div"`. */
  column?: ElementType;
}

export interface GridColumnsSlotProps {
  column?: SlotPropsInput<ComponentProps<"div">, GridColumnOwnerState>;
}

/**
 * Slot config for the grid background columns. Pass via the grid's slot props.
 *
 * NOTE: pass a referentially stable / memoized object so downstream memoization
 * is not defeated by a fresh object each render.
 */
export type GridColumnsSlotConfig = SlotConfig<GridColumnsSlots, GridColumnsSlotProps>;

interface GridColumnsProps {
  dates: Date[];
  colWidth: number;
  bodyHeight: number;
  /** Half-open range of date indices to render (virtualization window). */
  colRange: IndexRange;
  /** Column unit. Non-working shading only applies at day scale or finer. */
  unit?: CalendarUnit;
  /** Units per column, so a column's full time span can be measured. */
  step?: number;
  slots?: GridColumnsSlots;
  slotProps?: GridColumnsSlotProps;
}

/**
 * Background layer that paints one vertical column per day, shading weekends.
 * Purely decorative — `aria-hidden` and non-interactive. Only the columns
 * inside `colRange` are rendered; each is absolutely positioned at its date
 * offset so the windowed subset still aligns with the full-width grid.
 */
export function GridColumns({
  dates,
  colWidth,
  bodyHeight,
  colRange,
  unit = "day",
  step = 1,
  slots: slotsProp,
  slotProps: slotPropsProp,
}: GridColumnsProps) {
  const ganttSlots = useGanttSlots();
  const slots = slotsProp ?? ganttSlots.timeline?.gridColumn?.slots;
  const slotProps = slotPropsProp ?? ganttSlots.timeline?.gridColumn?.slotProps;

  const Column = slots?.column ?? "div";
  const { calendar } = useGanttWorkCalendar();
  // Shading is meaningless on a week-or-coarser column: it is partly working by
  // construction, so painting the whole thing would be wrong.
  const shadeable = unit === "day" || unit === "hour" || unit === "minute";

  return (
    <div className={styles.cols} role="presentation" aria-hidden>
      {dates.slice(colRange.start, colRange.end).map((date, i) => {
        const index = colRange.start + i;
        const info = shadeable
          ? nonWorkingInfo(calendar, date, addUnit(date, unit, step))
          : { isNonWorking: false, reason: undefined };
        // With no calendar, keep the historical Sat/Sun-only behaviour exactly.
        const nonWorking = calendar ? info.isNonWorking : unit === "day" && isWeekend(date);
        const ownerState: GridColumnOwnerState = {
          date,
          index,
          isNonWorking: nonWorking,
          nonWorkingReason: nonWorking ? (info.reason ?? "weekend") : undefined,
          isWeekend: nonWorking,
          colWidth,
          bodyHeight,
        };
        const columnProps = mergeSlotProps(
          {
            className: clsx(styles.col, nonWorking && styles.colWeekend),
            style: {
              left: index * colWidth,
              width: colWidth,
              height: bodyHeight,
            },
          },
          slotProps?.column,
          ownerState,
        );
        // Keyed by instant, not ISO string: the dates are distinct by
        // construction and this runs for every column on every scroll frame.
        return <Column key={date.getTime()} {...columnProps} />;
      })}
    </div>
  );
}

GridColumns.displayName = "GridColumns";
