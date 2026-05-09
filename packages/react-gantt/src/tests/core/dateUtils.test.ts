import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildDates,
  buildDatesFromTasks,
  diffDays,
  isWeekend,
  periodKey,
} from '../../core/dateUtils';

describe('periodKey', () => {
  describe('day', () => {
    it('returns the same key for the same day with step=1', () => {
      const a = new Date(2026, 0, 15);
      const b = new Date(2026, 0, 15);
      expect(periodKey(a, 'day', 1)).toBe(periodKey(b, 'day', 1));
    });

    it('returns different keys for consecutive days with step=1', () => {
      const a = new Date(2026, 0, 15);
      const b = new Date(2026, 0, 16);
      expect(periodKey(a, 'day', 1)).not.toBe(periodKey(b, 'day', 1));
    });

    it('groups consecutive days together with step=7', () => {
      const day0 = new Date(2026, 0, 1);
      const day6 = new Date(2026, 0, 7);
      const day7 = new Date(2026, 0, 8);
      expect(periodKey(day0, 'day', 7)).toBe(periodKey(day6, 'day', 7));
      expect(periodKey(day0, 'day', 7)).not.toBe(periodKey(day7, 'day', 7));
    });

    it('uses the d- prefix', () => {
      expect(periodKey(new Date(2026, 0, 1), 'day', 1)).toMatch(/^d-/);
    });
  });

  describe('week', () => {
    it('groups all days within the same Monday-anchored week', () => {
      // 2026-01-05 is a Monday; the week runs Mon..Sun.
      const monday = new Date(2026, 0, 5);
      const wednesday = new Date(2026, 0, 7);
      const sunday = new Date(2026, 0, 11);
      expect(periodKey(monday, 'week', 1)).toBe(periodKey(wednesday, 'week', 1));
      expect(periodKey(monday, 'week', 1)).toBe(periodKey(sunday, 'week', 1));
    });

    it('puts Sunday in the prior Monday-anchored week', () => {
      // 2026-01-04 is a Sunday; should map to the week starting 2025-12-29 (Mon).
      const sunday = new Date(2026, 0, 4);
      const priorMonday = new Date(2025, 11, 29);
      expect(periodKey(sunday, 'week', 1)).toBe(periodKey(priorMonday, 'week', 1));
    });

    it('produces different keys for adjacent weeks', () => {
      const weekA = new Date(2026, 0, 5);
      const weekB = new Date(2026, 0, 12);
      expect(periodKey(weekA, 'week', 1)).not.toBe(periodKey(weekB, 'week', 1));
    });

    it('groups two consecutive weeks with step=2', () => {
      const weekA = new Date(2026, 0, 5);
      const weekB = new Date(2026, 0, 12);
      const weekC = new Date(2026, 0, 19);
      expect(periodKey(weekA, 'week', 2)).toBe(periodKey(weekB, 'week', 2));
      expect(periodKey(weekA, 'week', 2)).not.toBe(periodKey(weekC, 'week', 2));
    });

    it('uses the w- prefix', () => {
      expect(periodKey(new Date(2026, 0, 5), 'week', 1)).toMatch(/^w-/);
    });
  });

  describe('month', () => {
    it('returns the same key for any day of the same month', () => {
      const first = new Date(2026, 3, 1);
      const last = new Date(2026, 3, 30);
      expect(periodKey(first, 'month', 1)).toBe(periodKey(last, 'month', 1));
    });

    it('produces different keys for adjacent months', () => {
      const apr = new Date(2026, 3, 15);
      const may = new Date(2026, 4, 15);
      expect(periodKey(apr, 'month', 1)).not.toBe(periodKey(may, 'month', 1));
    });

    it('groups months together with step=3', () => {
      const m0 = new Date(2026, 0, 15);
      const m2 = new Date(2026, 2, 15);
      const m3 = new Date(2026, 3, 15);
      expect(periodKey(m0, 'month', 3)).toBe(periodKey(m2, 'month', 3));
      expect(periodKey(m0, 'month', 3)).not.toBe(periodKey(m3, 'month', 3));
    });

    it('uses the mo- prefix', () => {
      expect(periodKey(new Date(2026, 0, 1), 'month', 1)).toMatch(/^mo-/);
    });
  });

  describe('quarter', () => {
    it('groups all months in the same quarter', () => {
      const jan = new Date(2026, 0, 15);
      const feb = new Date(2026, 1, 15);
      const mar = new Date(2026, 2, 15);
      const apr = new Date(2026, 3, 15);
      expect(periodKey(jan, 'quarter', 1)).toBe(periodKey(feb, 'quarter', 1));
      expect(periodKey(jan, 'quarter', 1)).toBe(periodKey(mar, 'quarter', 1));
      expect(periodKey(jan, 'quarter', 1)).not.toBe(periodKey(apr, 'quarter', 1));
    });

    it('groups two adjacent quarters with step=2', () => {
      const q1 = new Date(2026, 0, 15);
      const q2 = new Date(2026, 3, 15);
      const q3 = new Date(2026, 6, 15);
      expect(periodKey(q1, 'quarter', 2)).toBe(periodKey(q2, 'quarter', 2));
      expect(periodKey(q1, 'quarter', 2)).not.toBe(periodKey(q3, 'quarter', 2));
    });

    it('uses the q- prefix', () => {
      expect(periodKey(new Date(2026, 0, 1), 'quarter', 1)).toMatch(/^q-/);
    });
  });

  describe('year', () => {
    it('returns the same key for any day in the same year', () => {
      const jan = new Date(2026, 0, 1);
      const dec = new Date(2026, 11, 31);
      expect(periodKey(jan, 'year', 1)).toBe(periodKey(dec, 'year', 1));
    });

    it('produces different keys for adjacent years', () => {
      const a = new Date(2026, 5, 1);
      const b = new Date(2027, 5, 1);
      expect(periodKey(a, 'year', 1)).not.toBe(periodKey(b, 'year', 1));
    });

    it('groups years together with step=5', () => {
      const y0 = new Date(2025, 0, 1);
      const y4 = new Date(2029, 0, 1);
      const y5 = new Date(2030, 0, 1);
      expect(periodKey(y0, 'year', 5)).toBe(periodKey(y4, 'year', 5));
      expect(periodKey(y0, 'year', 5)).not.toBe(periodKey(y5, 'year', 5));
    });

    it('uses the y- prefix', () => {
      expect(periodKey(new Date(2026, 0, 1), 'year', 1)).toMatch(/^y-/);
    });
  });
});

describe('isWeekend', () => {
  it('returns true for Saturday', () => {
    // 2026-01-03 is a Saturday.
    expect(isWeekend(new Date(2026, 0, 3))).toBe(true);
  });

  it('returns true for Sunday', () => {
    // 2026-01-04 is a Sunday.
    expect(isWeekend(new Date(2026, 0, 4))).toBe(true);
  });

  it('returns false for Monday through Friday', () => {
    // 2026-01-05 is a Monday.
    for (let i = 0; i < 5; i++) {
      const d = new Date(2026, 0, 5 + i);
      expect(isWeekend(d)).toBe(false);
    }
  });
});

describe('diffDays', () => {
  it('returns 0 for the same day', () => {
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

  it('ignores the time-of-day component', () => {
    const from = new Date(2026, 0, 1, 23, 59, 59);
    const to = new Date(2026, 0, 2, 0, 0, 1);
    expect(diffDays(from, to)).toBe(1);
  });

  it('counts days across month boundaries', () => {
    const from = new Date(2026, 0, 30);
    const to = new Date(2026, 1, 2);
    expect(diffDays(from, to)).toBe(3);
  });

  it('counts days across year boundaries', () => {
    const from = new Date(2025, 11, 31);
    const to = new Date(2026, 0, 1);
    expect(diffDays(from, to)).toBe(1);
  });

  it('counts a full non-leap year as 365 days', () => {
    const from = new Date(2026, 0, 1);
    const to = new Date(2027, 0, 1);
    expect(diffDays(from, to)).toBe(365);
  });
});

describe('addDays', () => {
  it('returns an equivalent date when adding 0 days', () => {
    const d = new Date(2026, 0, 15);
    const result = addDays(d, 0);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(15);
  });

  it('adds positive days', () => {
    const d = new Date(2026, 0, 15);
    const result = addDays(d, 10);
    expect(result.getDate()).toBe(25);
    expect(result.getMonth()).toBe(0);
  });

  it('subtracts when given a negative count', () => {
    const d = new Date(2026, 0, 15);
    const result = addDays(d, -10);
    expect(result.getDate()).toBe(5);
    expect(result.getMonth()).toBe(0);
  });

  it('rolls over to the next month', () => {
    const d = new Date(2026, 0, 30);
    const result = addDays(d, 5);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(4);
  });

  it('rolls back to the previous year', () => {
    const d = new Date(2026, 0, 1);
    const result = addDays(d, -1);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(11);
    expect(result.getDate()).toBe(31);
  });

  it('does not mutate the input date', () => {
    const d = new Date(2026, 0, 15);
    const original = d.getTime();
    addDays(d, 10);
    expect(d.getTime()).toBe(original);
  });

  it('strips the time-of-day component', () => {
    const d = new Date(2026, 0, 15, 14, 30, 45, 500);
    const result = addDays(d, 1);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });
});

describe('buildDates', () => {
  it('returns an empty array for count=0', () => {
    expect(buildDates(new Date(2026, 0, 1), 0)).toEqual([]);
  });

  it('returns a single date for count=1', () => {
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

  it('crosses month boundaries correctly', () => {
    const start = new Date(2026, 0, 30);
    const result = buildDates(start, 4);
    expect(result.map((d) => `${d.getMonth()}-${d.getDate()}`)).toEqual([
      '0-30',
      '0-31',
      '1-1',
      '1-2',
    ]);
  });
});

describe('buildDatesFromTasks', () => {
  it('returns an empty array when given no tasks', () => {
    expect(buildDatesFromTasks([])).toEqual([]);
  });

  it('treats a task without endDate as a single-day span', () => {
    const tasks = [{ startDate: new Date(2026, 0, 5) }];
    const result = buildDatesFromTasks(tasks);
    expect(result).toHaveLength(1);
    expect(diffDays(tasks[0]!.startDate, result[0]!)).toBe(0);
  });

  it('spans from the earliest start to the latest end (inclusive)', () => {
    const tasks = [
      { startDate: new Date(2026, 0, 10), endDate: new Date(2026, 0, 12) },
      { startDate: new Date(2026, 0, 5), endDate: new Date(2026, 0, 8) },
      { startDate: new Date(2026, 0, 7), endDate: new Date(2026, 0, 15) },
    ];
    const result = buildDatesFromTasks(tasks);
    expect(result).toHaveLength(11);
    expect(diffDays(new Date(2026, 0, 5), result[0]!)).toBe(0);
    expect(diffDays(new Date(2026, 0, 15), result[result.length - 1]!)).toBe(0);
  });

  it('considers tasks lacking endDate when computing the max', () => {
    const tasks = [
      { startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 3) },
      { startDate: new Date(2026, 0, 10) },
    ];
    const result = buildDatesFromTasks(tasks);
    expect(result).toHaveLength(10);
    expect(diffDays(new Date(2026, 0, 1), result[0]!)).toBe(0);
    expect(diffDays(new Date(2026, 0, 10), result[result.length - 1]!)).toBe(0);
  });

  it('pads on both sides when padDays is given', () => {
    const tasks = [
      { startDate: new Date(2026, 0, 10), endDate: new Date(2026, 0, 12) },
    ];
    const result = buildDatesFromTasks(tasks, 2);
    // start shifts back by 2; span = (max-start) + 1 + padDays = 2 + 3 + 2 = 7
    // wait: span = diffDays(start, max) + 1 + padDays
    //   start = 2026-01-08, max = 2026-01-12 -> diffDays = 4 -> span = 4 + 1 + 2 = 7
    expect(result).toHaveLength(7);
    expect(diffDays(new Date(2026, 0, 8), result[0]!)).toBe(0);
    expect(diffDays(new Date(2026, 0, 14), result[result.length - 1]!)).toBe(0);
  });

  it('handles a single task with start and end dates', () => {
    const tasks = [
      { startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 5) },
    ];
    const result = buildDatesFromTasks(tasks);
    expect(result).toHaveLength(5);
    expect(diffDays(new Date(2026, 0, 1), result[0]!)).toBe(0);
    expect(diffDays(new Date(2026, 0, 5), result[result.length - 1]!)).toBe(0);
  });
});
