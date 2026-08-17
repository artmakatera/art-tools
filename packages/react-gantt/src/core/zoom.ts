import type { Scale } from "../types";
import { dateFormatter } from "./intl";

/**
 * One rung of the zoom ladder: the calendar `scales` to render and the pixel
 * width of a single (finest-unit) column. Zooming steps between levels.
 */
export interface ZoomLevel {
  scales: Scale[];
  colWidth: number;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const yearLabel = (d: Date) => String(d.getFullYear());
const quarterLabel = (d: Date) => `Q${Math.floor(d.getMonth() / 3) + 1}`;
const monthLong = dateFormatter({ month: "long", year: "numeric" });
const monthShort = dateFormatter({ month: "short" });
const dayOfMonth = (d: Date) => String(d.getDate());
const weekdayDay = dateFormatter({ weekday: "short", day: "numeric" });
const hourLabel = (d: Date) => `${pad2(d.getHours())}:00`;

/**
 * Default zoom ladder, ordered coarse → fine. Zooming in moves toward finer
 * (higher-index) levels; each rung pairs a coarse header row with a finer
 * bottom row whose unit is the column unit.
 */
export const DEFAULT_ZOOM_LEVELS: ZoomLevel[] = [
  {
    colWidth: 56,
    scales: [
      { unit: "year", step: 1, format: yearLabel },
      { unit: "quarter", step: 1, format: quarterLabel },
    ],
  },
  {
    colWidth: 44,
    scales: [
      { unit: "year", step: 1, format: yearLabel },
      { unit: "month", step: 1, format: monthShort },
    ],
  },
  {
    colWidth: 60,
    scales: [
      { unit: "month", step: 1, format: monthLong },
      { unit: "week", step: 1, format: weekdayDay },
    ],
  },
  {
    colWidth: 40,
    scales: [
      { unit: "month", step: 1, format: monthLong },
      { unit: "day", step: 1, format: dayOfMonth },
    ],
  },
  {
    colWidth: 44,
    scales: [
      { unit: "day", step: 1, format: weekdayDay },
      { unit: "hour", step: 1, format: hourLabel },
    ],
  },
];

/** Index of the default (month / day) rung in {@link DEFAULT_ZOOM_LEVELS}. */
export const DEFAULT_ZOOM_INDEX = 3;

/**
 * Resolve the ladder to use. A consumer's `zoomLevels` win verbatim; otherwise
 * start from the default ladder but let the standalone `scales`/`colWidth` props
 * override the default (month/day) rung, so existing consumers keep their look
 * and simply gain zoom.
 */
export function resolveZoomLevels(
  zoomLevels: ZoomLevel[] | undefined,
  scales: Scale[] | undefined,
  colWidth: number | undefined,
): ZoomLevel[] {
  if (zoomLevels && zoomLevels.length > 0) {
    return zoomLevels;
  }
  if (!scales && colWidth === undefined) {
    return DEFAULT_ZOOM_LEVELS;
  }
  return DEFAULT_ZOOM_LEVELS.map((level, i) =>
    i === DEFAULT_ZOOM_INDEX
      ? { scales: scales ?? level.scales, colWidth: colWidth ?? level.colWidth }
      : level,
  );
}
