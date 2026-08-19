import { describe, expect, it } from "vitest";
import { buildTimelineDates, resolveOriginAt, timelineOrigin } from "../../core/timeline";
import { addDays, startOfUnit } from "../../core/dateUtils";
import type { GanttTask, Scale } from "../../types";

/**
 * The DST origin drift, pinned so it cannot come back.
 *
 * The grid positions bars from `dates[0]`, while the task list and `useZoom`
 * derived the origin directly from `resolveOrigin`. Those were not the same value:
 * for `day` and `week`, `addUnit` routes through `addDays`, which zeroes to local
 * midnight and then adds a fixed 86_400_000 ms per day. Crossing a spring-forward
 * boundary lands on 23:00 of the previous day rather than midnight — and
 * `buildDates` re-zeroed it on the way to `dates[0]`, so only the grid saw the
 * corrected value.
 *
 * Concretely, with the library defaults (padDays 1, day columns, colWidth 40) and
 * a chart whose earliest task starts the day after Europe's spring-forward:
 *
 *     task list / useZoom : Sat Mar 28 2026 23:00
 *     grid / bars         : Sat Mar 28 2026 00:00   -> 23h = 38.3px, ~one column
 *
 * The suite pins TZ to Europe/Warsaw (see vitest.config.ts) precisely so this is
 * observable; in UTC the drift is exactly zero and none of this can be caught.
 */

const dayScales: Scale[] = [
  { unit: "month", step: 1, format: () => "" },
  { unit: "day", step: 1, format: (d) => String(d.getDate()) },
];

const weekScales: Scale[] = [
  { unit: "month", step: 1, format: () => "" },
  { unit: "week", step: 1, format: (d) => String(d.getDate()) },
];

function taskStarting(date: Date): GanttTask[] {
  return [{ id: "1", name: "T", startDate: date, endDate: addDays(date, 10) }];
}

/** Local dates that sit just after a DST transition in Europe/Warsaw. */
const AFTER_SPRING_FORWARD = new Date(2026, 2, 30); // clocks went +1h on Mar 29
const AFTER_FALL_BACK = new Date(2026, 9, 26); // clocks went -1h on Oct 25
const NO_TRANSITION = new Date(2026, 5, 15);

describe("timeline origin across DST", () => {
  for (const [label, start] of [
    ["after spring-forward", AFTER_SPRING_FORWARD],
    ["after fall-back", AFTER_FALL_BACK],
    ["no transition nearby", NO_TRANSITION],
  ] as const) {
    it(`agrees with the column axis it will be measured against (${label})`, () => {
      const tasks = taskStarting(start);
      // This is the invariant the whole bug came down to: the origin every
      // consumer derives must be the same instant the grid lays its columns from.
      expect(timelineOrigin(tasks, dayScales, 1)).toEqual(
        buildTimelineDates(tasks, 1, dayScales)[0],
      );
    });

    it(`lands exactly on a unit boundary (${label})`, () => {
      const origin = timelineOrigin(taskStarting(start), dayScales, 1)!;
      // What `resolveOriginAt`'s name has always claimed, and what the un-normalised
      // version did not deliver: midnight, not 23:00 or 01:00.
      expect(origin).toEqual(startOfUnit(origin, "day"));
      expect(origin.getHours()).toBe(0);
      expect(origin.getMinutes()).toBe(0);
    });
  }

  it("holds for week columns too, where the same fixed-ms addition applies", () => {
    const tasks = taskStarting(AFTER_SPRING_FORWARD);
    const origin = timelineOrigin(tasks, weekScales, 1)!;
    expect(origin).toEqual(buildTimelineDates(tasks, 1, weekScales)[0]);
    expect(origin).toEqual(startOfUnit(origin, "week"));
  });

  it("still pads outward by whole columns", () => {
    // The fix must not change what padding means: one day-column of pad from a
    // Monday start is the Sunday before it.
    const monday = new Date(2026, 5, 15);
    expect(resolveOriginAt(monday, "day", 1, 1)).toEqual(new Date(2026, 5, 14));
    expect(resolveOriginAt(monday, "day", 3, 1)).toEqual(new Date(2026, 5, 12));
    expect(resolveOriginAt(monday, "day", 0, 1)).toEqual(monday);
  });

  it("is idempotent, so re-deriving an origin cannot walk it", () => {
    const origin = resolveOriginAt(AFTER_SPRING_FORWARD, "day", 1, 1);
    expect(resolveOriginAt(origin, "day", 0, 1)).toEqual(origin);
  });

  it("returns null for an empty task list", () => {
    expect(timelineOrigin([], dayScales, 1)).toBeNull();
    expect(buildTimelineDates([], 1, dayScales)).toEqual([]);
  });
});
