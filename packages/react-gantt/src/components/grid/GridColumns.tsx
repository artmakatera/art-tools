import { clsx } from "clsx";
import type { ComponentProps, ElementType } from "react";
import { isWeekend } from "../../core/dateUtils";
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
  /** Column unit; weekends are only shaded when this is `"day"`. */
  unit?: CalendarUnit;
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
  slots: slotsProp,
  slotProps: slotPropsProp,
}: GridColumnsProps) {
  const ganttSlots = useGanttSlots();
  const slots = slotsProp ?? ganttSlots.timeline?.gridColumn?.slots;
  const slotProps = slotPropsProp ?? ganttSlots.timeline?.gridColumn?.slotProps;

  const Column = slots?.column ?? "div";

  return (
    <div className={styles.cols} aria-hidden>
      {dates.slice(colRange.start, colRange.end).map((date, i) => {
        const index = colRange.start + i;
        const weekend = unit === "day" && isWeekend(date);
        const ownerState: GridColumnOwnerState = {
          date,
          index,
          isWeekend: weekend,
          colWidth,
          bodyHeight,
        };
        const columnProps = mergeSlotProps(
          {
            className: clsx(styles.col, weekend && styles.colWeekend),
            style: {
              left: index * colWidth,
              width: colWidth,
              height: bodyHeight,
            },
          },
          slotProps?.column,
          ownerState,
        );
        return <Column key={date.toISOString()} {...columnProps} />;
      })}
    </div>
  );
}

GridColumns.displayName = "GridColumns";
