import type { CalendarUnit, Scale } from "../types";
import { dateFormatter } from "./intl";

const formatMonthYear = dateFormatter({ month: "long", year: "numeric" });

/**
 * Single source of truth for the default calendar scales. The Calendar renders
 * these rows and the TaskListHeader derives its height from their count
 * (`scales.length * rowHeight + 2`), so both MUST read the same array — keep
 * this the only default to prevent the header and calendar drifting apart.
 */
export const DEFAULT_SCALES: Scale[] = [
  {
    unit: "month",
    step: 1,
    format: formatMonthYear,
  },
  {
    unit: "day",
    step: 1,
    format: (d: Date) => String(d.getDate()),
  },
];

/**
 * The unit of the bottom-most (finest) scale row — the one that maps 1:1 to a
 * column, and therefore defines the time span of a single `colWidth`. Bar
 * geometry uses this to convert dates <-> pixels. Falls back to the defaults
 * when `scales` is omitted, and to `"day"` for an empty array.
 */
export function resolveColumnUnit(scales?: Scale[]): CalendarUnit {
  return (scales ?? DEFAULT_SCALES).at(-1)?.unit ?? "day";
}

/**
 * The `step` of the bottom-most (finest) scale row — how many units each column
 * spans. Pairs with {@link resolveColumnUnit}; defaults to 1.
 */
export function resolveColumnStep(scales?: Scale[]): number {
  return (scales ?? DEFAULT_SCALES).at(-1)?.step ?? 1;
}
