import { describe, expect, it } from "vitest";
import { buildTimelineDates, resolveOriginAt } from "../../core/timeline";
import { diffDays } from "../../core/dateUtils";
import type { Scale } from "../../types";

/**
 * Timeline geometry: task range -> origin -> column axis.
 *
 * Moved here with the functions themselves when `core/timeline.ts` was split out
 * of `dateUtils`, which is now pure unit/instant math that knows nothing about
 * tasks or scales.
 */

const scale = (unit: Scale["unit"], step = 1): Scale => ({
  unit,
  step,
  format: () => "",
});

describe("buildTimelineDates", () => {
  it("returns an empty array when given no tasks", () => {
    expect(buildTimelineDates([])).toEqual([]);
  });

  it("treats a task without endDate as a single-day span", () => {
    const tasks = [{ startDate: new Date(2026, 0, 5) }];
    const result = buildTimelineDates(tasks);
    expect(result).toHaveLength(1);
    expect(diffDays(tasks[0]!.startDate, result[0]!)).toBe(0);
  });

  it("spans from the earliest start to the latest end (inclusive)", () => {
    const tasks = [
      { startDate: new Date(2026, 0, 10), endDate: new Date(2026, 0, 12) },
      { startDate: new Date(2026, 0, 5), endDate: new Date(2026, 0, 8) },
      { startDate: new Date(2026, 0, 7), endDate: new Date(2026, 0, 15) },
    ];
    const result = buildTimelineDates(tasks);
    expect(result).toHaveLength(11);
    expect(diffDays(new Date(2026, 0, 5), result[0]!)).toBe(0);
    expect(diffDays(new Date(2026, 0, 15), result[result.length - 1]!)).toBe(0);
  });

  it("considers tasks lacking endDate when computing the max", () => {
    const tasks = [
      { startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 3) },
      { startDate: new Date(2026, 0, 10) },
    ];
    const result = buildTimelineDates(tasks);
    expect(result).toHaveLength(10);
    expect(diffDays(new Date(2026, 0, 1), result[0]!)).toBe(0);
    expect(diffDays(new Date(2026, 0, 10), result[result.length - 1]!)).toBe(0);
  });

  it("pads on both sides when padDays is given", () => {
    const tasks = [{ startDate: new Date(2026, 0, 10), endDate: new Date(2026, 0, 12) }];
    const result = buildTimelineDates(tasks, 2);
    // start shifts back by 2; span = (max-start) + 1 + padDays = 2 + 3 + 2 = 7
    // wait: span = diffDays(start, max) + 1 + padDays
    //   start = 2026-01-08, max = 2026-01-12 -> diffDays = 4 -> span = 4 + 1 + 2 = 7
    expect(result).toHaveLength(7);
    expect(diffDays(new Date(2026, 0, 8), result[0]!)).toBe(0);
    expect(diffDays(new Date(2026, 0, 14), result[result.length - 1]!)).toBe(0);
  });

  it("handles a single task with start and end dates", () => {
    const tasks = [{ startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 5) }];
    const result = buildTimelineDates(tasks);
    expect(result).toHaveLength(5);
    expect(diffDays(new Date(2026, 0, 1), result[0]!)).toBe(0);
    expect(diffDays(new Date(2026, 0, 5), result[result.length - 1]!)).toBe(0);
  });

  it("steps by the finest scale unit (month), aligned to month starts", () => {
    const tasks = [{ startDate: new Date(2026, 0, 15), endDate: new Date(2026, 2, 20) }];
    const result = buildTimelineDates(tasks, 0, [scale("year"), scale("month")]);
    expect(result.map((d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)).toEqual([
      "2026-0-1",
      "2026-1-1",
      "2026-2-1",
    ]);
  });

  it("pads by whole columns of the finest unit (month)", () => {
    const tasks = [{ startDate: new Date(2026, 5, 10), endDate: new Date(2026, 5, 20) }];
    const result = buildTimelineDates(tasks, 1, [scale("year"), scale("month")]);
    expect(result.map((d) => d.getMonth())).toEqual([4, 5, 6]); // May, June, July
  });

  it("steps by the hour for a sub-day scale", () => {
    const tasks = [
      {
        startDate: new Date(2026, 0, 1, 9, 20),
        endDate: new Date(2026, 0, 1, 11, 40),
      },
    ];
    const result = buildTimelineDates(tasks, 0, [scale("day"), scale("hour")]);
    // Aligned to top-of-hour 9..11 inclusive.
    expect(result.map((d) => d.getHours())).toEqual([9, 10, 11]);
    expect(result.every((d) => d.getMinutes() === 0)).toBe(true);
  });
});

describe("resolveOriginAt", () => {
  it("aligns to the unit boundary then pads by whole columns", () => {
    const o = resolveOriginAt(new Date(2026, 2, 15), "month", 2, 1); // Mar 15 -> Mar 1 -> -2mo = Jan 1
    expect([o.getFullYear(), o.getMonth(), o.getDate()]).toEqual([2026, 0, 1]);
  });
});
