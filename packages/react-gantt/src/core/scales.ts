import type { Scale } from "../types";

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
    format: (d: Date) =>
      d.toLocaleString(undefined, { month: "long", year: "numeric" }),
  },
  {
    unit: "day",
    step: 1,
    format: (d: Date) => String(d.getDate()),
  },
];
