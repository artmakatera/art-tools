import { describe, expect, it } from "vitest";
import {
  MINUTES_PER_DAY,
  buildCalendar,
  calendarKey,
  nextOverrideDay,
  parseWorkTimeRange,
  prevOverrideDay,
  shapeFor,
} from "../../core/calendar";
import { civilDayIndex } from "../../core/dateUtils";
import type { GanttCalendar } from "../../types";

// Reference week — Jan 2026: Jan 1 Thu, Jan 2 Fri, Jan 3 Sat, Jan 4 Sun, Jan 5 Mon, Jan 6 Tue.
const jan = (day: number, hours = 0, minutes = 0) => new Date(2026, 0, day, hours, minutes);

const build = (calendar: GanttCalendar) => buildCalendar(calendar, calendarKey(calendar));

const shapeOn = (calendar: GanttCalendar, date: Date) =>
  shapeFor(build(calendar), civilDayIndex(date));

describe("parseWorkTimeRange", () => {
  it("parses an H:MM-H:MM range into minutes from midnight", () => {
    expect(parseWorkTimeRange("8:30-12:00")).toEqual([510, 720]);
  });

  it("accepts a zero-padded hour", () => {
    expect(parseWorkTimeRange("08:30-12:00")).toEqual([510, 720]);
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseWorkTimeRange("  9:00 - 17:00 ")).toEqual([540, 1020]);
  });

  it("accepts 24:00 as an end", () => {
    expect(parseWorkTimeRange("0:00-24:00")).toEqual([0, MINUTES_PER_DAY]);
  });

  it("rejects an inverted range", () => {
    expect(() => parseWorkTimeRange("12:00-8:00")).toThrow(/end must be after start/);
  });

  it("rejects an end past midnight", () => {
    expect(() => parseWorkTimeRange("8:00-25:00")).toThrow(/no later than 24:00/);
  });

  it("rejects a malformed range", () => {
    expect(() => parseWorkTimeRange("8-12")).toThrow(/expected "H:MM-H:MM"/);
  });
});

describe("buildCalendar", () => {
  it("treats omitted hours as a FULL day, not business hours", () => {
    // ADR-013: a calendar that only marks weekends off must stay day-granular.
    const shape = shapeOn({ days: { 0: false, 6: false } }, jan(5));
    expect(shape.totalMinutes).toBe(MINUTES_PER_DAY);
    expect(shape.intervals).toEqual([0, MINUTES_PER_DAY]);
  });

  it("marks a false weekday as a day off", () => {
    const shape = shapeOn({ days: { 0: false, 6: false } }, jan(3)); // Saturday
    expect(shape.totalMinutes).toBe(0);
    expect(shape.intervals).toEqual([]);
  });

  it("applies global hours to every day with no override", () => {
    const shape = shapeOn({ hours: ["8:00-17:00"] }, jan(5));
    expect(shape.intervals).toEqual([480, 1020]);
    expect(shape.totalMinutes).toBe(540);
  });

  it("leaves a gap between ranges as non-working time", () => {
    const shape = shapeOn({ hours: ["8:00-12:00", "13:00-17:00"] }, jan(5));
    expect(shape.intervals).toEqual([480, 720, 780, 1020]);
    expect(shape.totalMinutes).toBe(480);
  });

  it("merges adjacent ranges so they intern identically to the single range", () => {
    const split = shapeOn({ hours: ["8:00-12:00", "12:00-17:00"] }, jan(5));
    const whole = shapeOn({ hours: ["8:00-17:00"] }, jan(5));
    expect(split.intervals).toEqual(whole.intervals);
    expect(split.totalMinutes).toBe(whole.totalMinutes);
  });

  it("merges overlapping ranges", () => {
    const shape = shapeOn({ hours: ["8:00-13:00", "12:00-17:00"] }, jan(5));
    expect(shape.intervals).toEqual([480, 1020]);
  });

  it("sorts ranges given out of order", () => {
    const shape = shapeOn({ hours: ["13:00-17:00", "8:00-12:00"] }, jan(5));
    expect(shape.intervals).toEqual([480, 720, 780, 1020]);
  });

  describe("resolution order", () => {
    const calendar: GanttCalendar = {
      hours: ["9:00-17:00"],
      days: { 5: ["8:00-12:00"] }, // short Friday
      dates: { "2026-01-02": ["10:00-11:00"] }, // that specific Friday
    };

    it("lets a weekday rule beat the global hours", () => {
      expect(shapeOn(calendar, jan(9)).intervals).toEqual([480, 720]); // Fri Jan 9
    });

    it("lets a specific date beat the weekday rule", () => {
      expect(shapeOn(calendar, jan(2)).intervals).toEqual([600, 660]); // Fri Jan 2
    });

    it("falls back to the global hours for an unlisted day", () => {
      expect(shapeOn(calendar, jan(5)).intervals).toEqual([540, 1020]); // Mon
    });
  });

  it("interns structurally identical weekday shapes", () => {
    const calendar = build({ hours: ["8:00-17:00"], days: { 0: false, 6: false } });
    expect(calendar.byWeekday[1]).toBe(calendar.byWeekday[2]);
    expect(calendar.byWeekday[0]).toBe(calendar.byWeekday[6]);
    expect(calendar.byWeekday[0]).not.toBe(calendar.byWeekday[1]);
  });

  it("flags an all-days-full calendar as always working", () => {
    expect(build({}).isAlwaysWorking).toBe(true);
    expect(build({ days: { 6: false } }).isAlwaysWorking).toBe(false);
    expect(build({ dates: { "2026-01-01": false } }).isAlwaysWorking).toBe(false);
  });

  it("flags a calendar of whole days as day-granular", () => {
    expect(build({ days: { 0: false, 6: false } }).isDayGranular).toBe(true);
    expect(build({ hours: ["8:00-17:00"] }).isDayGranular).toBe(false);
  });

  describe("msPerWorkingDay", () => {
    it("is a whole day when every working day is full", () => {
      // ADR-018 — this is what keeps `duration: 3` meaning three whole days.
      expect(build({ days: { 0: false, 6: false } }).msPerWorkingDay).toBe(
        MINUTES_PER_DAY * 60_000,
      );
    });

    it("is the longest working day when the week is uneven", () => {
      const calendar = build({
        hours: ["8:00-12:00", "13:00-17:00"], // 8h
        days: { 5: ["8:00-12:00"], 0: false, 6: false }, // 4h Friday
      });
      expect(calendar.msPerWorkingDay).toBe(480 * 60_000);
    });

    it("is zero for a calendar with no working time at all", () => {
      expect(build({ hours: false }).msPerWorkingDay).toBe(0);
    });
  });

  it("rejects a date key that is not a local civil date", () => {
    expect(() => build({ dates: { "01/01/2026": false } })).toThrow(/YYYY-MM-DD/);
  });
});

describe("calendarKey", () => {
  it("is empty for no calendar", () => {
    expect(calendarKey(undefined)).toBe("");
  });

  it("is equal for structurally equal but distinct objects", () => {
    const a = calendarKey({ hours: ["8:00-17:00"], days: { 0: false } });
    const b = calendarKey({ hours: ["8:00-17:00"], days: { 0: false } });
    expect(a).toBe(b);
  });

  it("is independent of date-key insertion order", () => {
    const a = calendarKey({ dates: { "2026-12-25": false, "2026-01-01": false } });
    const b = calendarKey({ dates: { "2026-01-01": false, "2026-12-25": false } });
    expect(a).toBe(b);
  });

  it("distinguishes a day off from default hours", () => {
    expect(calendarKey({ days: { 5: false } })).not.toBe(calendarKey({ days: {} }));
  });

  it("changes when any range changes", () => {
    expect(calendarKey({ hours: ["8:00-17:00"] })).not.toBe(calendarKey({ hours: ["9:00-17:00"] }));
  });
});

describe("override lookup", () => {
  const calendar = build({
    days: { 0: false, 6: false },
    dates: { "2026-01-01": false, "2026-12-25": false },
  });
  const newYear = civilDayIndex(jan(1));
  const christmas = civilDayIndex(new Date(2026, 11, 25));

  it("finds the next override at or after a day", () => {
    expect(nextOverrideDay(calendar, newYear)).toBe(newYear);
    expect(nextOverrideDay(calendar, newYear + 1)).toBe(christmas);
    expect(nextOverrideDay(calendar, christmas + 1)).toBe(Number.POSITIVE_INFINITY);
  });

  it("finds the previous override at or before a day", () => {
    expect(prevOverrideDay(calendar, christmas)).toBe(christmas);
    expect(prevOverrideDay(calendar, christmas - 1)).toBe(newYear);
    expect(prevOverrideDay(calendar, newYear - 1)).toBe(Number.NEGATIVE_INFINITY);
  });
});
