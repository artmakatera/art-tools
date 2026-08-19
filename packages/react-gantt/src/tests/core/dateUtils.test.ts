import { describe, expect, it } from "vitest";
import {
  addDays,
  addUnit,
  buildDates,
  dateAtOffset,
  diffDays,
  isWeekend,
  periodKey,
  startOfUnit,
  unitOffset,
} from "../../core/dateUtils";

/** Minimal scale row; format is irrelevant to date math. */

describe("periodKey", () => {
  describe("day", () => {
    it("returns the same key for the same day with step=1", () => {
      const a = new Date(2026, 0, 15);
      const b = new Date(2026, 0, 15);
      expect(periodKey(a, "day", 1)).toBe(periodKey(b, "day", 1));
    });

    it("returns different keys for consecutive days with step=1", () => {
      const a = new Date(2026, 0, 15);
      const b = new Date(2026, 0, 16);
      expect(periodKey(a, "day", 1)).not.toBe(periodKey(b, "day", 1));
    });

    it("groups consecutive days together with step=7", () => {
      const day0 = new Date(2026, 0, 1);
      const day6 = new Date(2026, 0, 7);
      const day7 = new Date(2026, 0, 8);
      expect(periodKey(day0, "day", 7)).toBe(periodKey(day6, "day", 7));
      expect(periodKey(day0, "day", 7)).not.toBe(periodKey(day7, "day", 7));
    });

    it("uses the d- prefix", () => {
      expect(periodKey(new Date(2026, 0, 1), "day", 1)).toMatch(/^d-/);
    });
  });

  describe("week", () => {
    it("groups all days within the same Monday-anchored week", () => {
      // 2026-01-05 is a Monday; the week runs Mon..Sun.
      const monday = new Date(2026, 0, 5);
      const wednesday = new Date(2026, 0, 7);
      const sunday = new Date(2026, 0, 11);
      expect(periodKey(monday, "week", 1)).toBe(periodKey(wednesday, "week", 1));
      expect(periodKey(monday, "week", 1)).toBe(periodKey(sunday, "week", 1));
    });

    it("puts Sunday in the prior Monday-anchored week", () => {
      // 2026-01-04 is a Sunday; should map to the week starting 2025-12-29 (Mon).
      const sunday = new Date(2026, 0, 4);
      const priorMonday = new Date(2025, 11, 29);
      expect(periodKey(sunday, "week", 1)).toBe(periodKey(priorMonday, "week", 1));
    });

    it("produces different keys for adjacent weeks", () => {
      const weekA = new Date(2026, 0, 5);
      const weekB = new Date(2026, 0, 12);
      expect(periodKey(weekA, "week", 1)).not.toBe(periodKey(weekB, "week", 1));
    });

    it("groups two consecutive weeks with step=2", () => {
      const weekA = new Date(2026, 0, 5);
      const weekB = new Date(2026, 0, 12);
      const weekC = new Date(2026, 0, 19);
      expect(periodKey(weekA, "week", 2)).toBe(periodKey(weekB, "week", 2));
      expect(periodKey(weekA, "week", 2)).not.toBe(periodKey(weekC, "week", 2));
    });

    it("uses the w- prefix", () => {
      expect(periodKey(new Date(2026, 0, 5), "week", 1)).toMatch(/^w-/);
    });
  });

  describe("month", () => {
    it("returns the same key for any day of the same month", () => {
      const first = new Date(2026, 3, 1);
      const last = new Date(2026, 3, 30);
      expect(periodKey(first, "month", 1)).toBe(periodKey(last, "month", 1));
    });

    it("produces different keys for adjacent months", () => {
      const apr = new Date(2026, 3, 15);
      const may = new Date(2026, 4, 15);
      expect(periodKey(apr, "month", 1)).not.toBe(periodKey(may, "month", 1));
    });

    it("groups months together with step=3", () => {
      const m0 = new Date(2026, 0, 15);
      const m2 = new Date(2026, 2, 15);
      const m3 = new Date(2026, 3, 15);
      expect(periodKey(m0, "month", 3)).toBe(periodKey(m2, "month", 3));
      expect(periodKey(m0, "month", 3)).not.toBe(periodKey(m3, "month", 3));
    });

    it("uses the mo- prefix", () => {
      expect(periodKey(new Date(2026, 0, 1), "month", 1)).toMatch(/^mo-/);
    });
  });

  describe("quarter", () => {
    it("groups all months in the same quarter", () => {
      const jan = new Date(2026, 0, 15);
      const feb = new Date(2026, 1, 15);
      const mar = new Date(2026, 2, 15);
      const apr = new Date(2026, 3, 15);
      expect(periodKey(jan, "quarter", 1)).toBe(periodKey(feb, "quarter", 1));
      expect(periodKey(jan, "quarter", 1)).toBe(periodKey(mar, "quarter", 1));
      expect(periodKey(jan, "quarter", 1)).not.toBe(periodKey(apr, "quarter", 1));
    });

    it("groups two adjacent quarters with step=2", () => {
      const q1 = new Date(2026, 0, 15);
      const q2 = new Date(2026, 3, 15);
      const q3 = new Date(2026, 6, 15);
      expect(periodKey(q1, "quarter", 2)).toBe(periodKey(q2, "quarter", 2));
      expect(periodKey(q1, "quarter", 2)).not.toBe(periodKey(q3, "quarter", 2));
    });

    it("uses the q- prefix", () => {
      expect(periodKey(new Date(2026, 0, 1), "quarter", 1)).toMatch(/^q-/);
    });
  });

  describe("year", () => {
    it("returns the same key for any day in the same year", () => {
      const jan = new Date(2026, 0, 1);
      const dec = new Date(2026, 11, 31);
      expect(periodKey(jan, "year", 1)).toBe(periodKey(dec, "year", 1));
    });

    it("produces different keys for adjacent years", () => {
      const a = new Date(2026, 5, 1);
      const b = new Date(2027, 5, 1);
      expect(periodKey(a, "year", 1)).not.toBe(periodKey(b, "year", 1));
    });

    it("groups years together with step=5", () => {
      const y0 = new Date(2025, 0, 1);
      const y4 = new Date(2029, 0, 1);
      const y5 = new Date(2030, 0, 1);
      expect(periodKey(y0, "year", 5)).toBe(periodKey(y4, "year", 5));
      expect(periodKey(y0, "year", 5)).not.toBe(periodKey(y5, "year", 5));
    });

    it("uses the y- prefix", () => {
      expect(periodKey(new Date(2026, 0, 1), "year", 1)).toMatch(/^y-/);
    });
  });
});

describe("isWeekend", () => {
  it("returns true for Saturday", () => {
    // 2026-01-03 is a Saturday.
    expect(isWeekend(new Date(2026, 0, 3))).toBe(true);
  });

  it("returns true for Sunday", () => {
    // 2026-01-04 is a Sunday.
    expect(isWeekend(new Date(2026, 0, 4))).toBe(true);
  });

  it("returns false for Monday through Friday", () => {
    // 2026-01-05 is a Monday.
    for (let i = 0; i < 5; i++) {
      const d = new Date(2026, 0, 5 + i);
      expect(isWeekend(d)).toBe(false);
    }
  });
});

describe("diffDays", () => {
  it("returns 0 for the same day", () => {
    const a = new Date(2026, 0, 15, 9);
    const b = new Date(2026, 0, 15, 18);
    expect(diffDays(a, b)).toBe(0);
  });

  it('returns a positive count when "to" is after "from"', () => {
    const from = new Date(2026, 0, 1);
    const to = new Date(2026, 0, 11);
    expect(diffDays(from, to)).toBe(10);
  });

  it('returns a negative count when "to" is before "from"', () => {
    const from = new Date(2026, 0, 11);
    const to = new Date(2026, 0, 1);
    expect(diffDays(from, to)).toBe(-10);
  });

  it("ignores the time-of-day component", () => {
    const from = new Date(2026, 0, 1, 23, 59, 59);
    const to = new Date(2026, 0, 2, 0, 0, 1);
    expect(diffDays(from, to)).toBe(1);
  });

  it("counts days across month boundaries", () => {
    const from = new Date(2026, 0, 30);
    const to = new Date(2026, 1, 2);
    expect(diffDays(from, to)).toBe(3);
  });

  it("counts days across year boundaries", () => {
    const from = new Date(2025, 11, 31);
    const to = new Date(2026, 0, 1);
    expect(diffDays(from, to)).toBe(1);
  });

  it("counts a full non-leap year as 365 days", () => {
    const from = new Date(2026, 0, 1);
    const to = new Date(2027, 0, 1);
    expect(diffDays(from, to)).toBe(365);
  });
});

describe("addDays", () => {
  it("returns an equivalent date when adding 0 days", () => {
    const d = new Date(2026, 0, 15);
    const result = addDays(d, 0);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(15);
  });

  it("adds positive days", () => {
    const d = new Date(2026, 0, 15);
    const result = addDays(d, 10);
    expect(result.getDate()).toBe(25);
    expect(result.getMonth()).toBe(0);
  });

  it("subtracts when given a negative count", () => {
    const d = new Date(2026, 0, 15);
    const result = addDays(d, -10);
    expect(result.getDate()).toBe(5);
    expect(result.getMonth()).toBe(0);
  });

  it("rolls over to the next month", () => {
    const d = new Date(2026, 0, 30);
    const result = addDays(d, 5);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(4);
  });

  it("rolls back to the previous year", () => {
    const d = new Date(2026, 0, 1);
    const result = addDays(d, -1);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(11);
    expect(result.getDate()).toBe(31);
  });

  it("does not mutate the input date", () => {
    const d = new Date(2026, 0, 15);
    const original = d.getTime();
    addDays(d, 10);
    expect(d.getTime()).toBe(original);
  });

  it("strips the time-of-day component", () => {
    const d = new Date(2026, 0, 15, 14, 30, 45, 500);
    const result = addDays(d, 1);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });
});

describe("buildDates", () => {
  it("returns an empty array for count=0", () => {
    expect(buildDates(new Date(2026, 0, 1), 0)).toEqual([]);
  });

  it("returns a single date for count=1", () => {
    const start = new Date(2026, 0, 1);
    const result = buildDates(start, 1);
    expect(result).toHaveLength(1);
    expect(diffDays(start, result[0]!)).toBe(0);
  });

  it('returns consecutive days starting at "start"', () => {
    const start = new Date(2026, 0, 1);
    const result = buildDates(start, 5);
    expect(result).toHaveLength(5);
    result.forEach((d, i) => {
      expect(diffDays(start, d)).toBe(i);
    });
  });

  it("crosses month boundaries correctly", () => {
    const start = new Date(2026, 0, 30);
    const result = buildDates(start, 4);
    expect(result.map((d) => `${d.getMonth()}-${d.getDate()}`)).toEqual([
      "0-30",
      "0-31",
      "1-1",
      "1-2",
    ]);
  });
});

describe("startOfUnit", () => {
  it("truncates to top of minute and hour", () => {
    const mi = startOfUnit(new Date(2026, 0, 1, 9, 20, 45, 500), "minute");
    expect([mi.getMinutes(), mi.getSeconds(), mi.getMilliseconds()]).toEqual([20, 0, 0]);
    const h = startOfUnit(new Date(2026, 0, 1, 9, 20, 45), "hour");
    expect([h.getHours(), h.getMinutes(), h.getSeconds()]).toEqual([9, 0, 0]);
  });

  it("anchors day/week/month/quarter/year", () => {
    expect(startOfUnit(new Date(2026, 0, 15, 14), "day").getHours()).toBe(0);
    // 2026-01-15 is a Thursday -> Monday is 2026-01-12.
    const w = startOfUnit(new Date(2026, 0, 15), "week");
    expect([w.getDate(), w.getDay()]).toEqual([12, 1]);
    expect(startOfUnit(new Date(2026, 0, 15), "month").getDate()).toBe(1);
    const q = startOfUnit(new Date(2026, 4, 20), "quarter"); // May -> Q2 starts April
    expect([q.getMonth(), q.getDate()]).toEqual([3, 1]);
    const y = startOfUnit(new Date(2026, 6, 9), "year");
    expect([y.getMonth(), y.getDate()]).toEqual([0, 1]);
  });
});

describe("addUnit", () => {
  it("adds fixed-length units (minute/hour/day/week)", () => {
    const base = new Date(2026, 0, 1, 23, 30);
    expect(addUnit(base, "minute", 45).getTime()).toBe(base.getTime() + 45 * 60_000);
    // 23:30 + 1h crosses midnight into Jan 2.
    const h = addUnit(base, "hour", 1);
    expect([h.getDate(), h.getHours()]).toEqual([2, 0]);
    expect(diffDays(new Date(2026, 0, 1), addUnit(new Date(2026, 0, 1), "day", 3))).toBe(3);
    expect(diffDays(new Date(2026, 0, 1), addUnit(new Date(2026, 0, 1), "week", 2))).toBe(14);
  });

  it("adds calendar months/quarters/years", () => {
    expect(addUnit(new Date(2026, 0, 15), "month", 1).getMonth()).toBe(1);
    expect(addUnit(new Date(2026, 1, 10), "quarter", 1).getMonth()).toBe(4); // Feb -> May
    expect(addUnit(new Date(2024, 5, 1), "year", 2).getFullYear()).toBe(2026);
  });
});

describe("unitOffset / dateAtOffset", () => {
  it("is linear for fixed-length units", () => {
    const origin = new Date(2026, 0, 1, 0, 0);
    expect(unitOffset(origin, new Date(2026, 0, 1, 3, 30), "hour")).toBeCloseTo(3.5, 9);
    expect(unitOffset(origin, new Date(2026, 0, 15), "day")).toBeCloseTo(14, 9);
    expect(unitOffset(origin, new Date(2026, 0, 15), "week")).toBeCloseTo(2, 9);
  });

  it("interpolates within a partial month", () => {
    const origin = new Date(2026, 0, 1);
    expect(unitOffset(origin, new Date(2026, 1, 15), "month")).toBeCloseTo(1 + 14 / 28, 9);
  });

  it("round-trips through dateAtOffset for every unit", () => {
    const origin = new Date(2026, 0, 1);
    const probe = new Date(2026, 6, 9, 8, 15, 0);
    (["minute", "hour", "day", "week", "month", "quarter", "year"] as const).forEach((unit) => {
      const back = dateAtOffset(origin, unit, unitOffset(origin, probe, unit));
      expect(back.getTime()).toBeCloseTo(probe.getTime(), -1);
    });
  });
});

describe("periodKey (sub-day)", () => {
  it("groups by hour and minute", () => {
    const a = new Date(2026, 0, 1, 9, 15);
    const b = new Date(2026, 0, 1, 9, 45);
    const c = new Date(2026, 0, 1, 10, 5);
    expect(periodKey(a, "hour", 1)).toBe(periodKey(b, "hour", 1));
    expect(periodKey(a, "hour", 1)).not.toBe(periodKey(c, "hour", 1));
    expect(periodKey(a, "minute", 1)).not.toBe(periodKey(b, "minute", 1));
  });
});
