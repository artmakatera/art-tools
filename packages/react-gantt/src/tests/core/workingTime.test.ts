import { describe, expect, it } from 'vitest';
import { buildCalendar, calendarKey } from '../../core/calendar';
import {
  addWorkingMs,
  addWorkingUnits,
  closestWorkingTime,
  countWorkingMs,
  isNonWorkingSpan,
  isWorkingTime,
  nearestWorkingTime,
  workingMsPerUnit,
} from '../../core/workingTime';
import type { GanttCalendar } from '../../types';

// Reference week — Jan 2026: Jan 1 Thu, Jan 2 Fri, Jan 3 Sat, Jan 4 Sun, Jan 5 Mon,
// Jan 6 Tue, Jan 7 Wed, Jan 8 Thu, Jan 9 Fri, Jan 10 Sat.
const jan = (day: number, hours = 0, minutes = 0, ms = 0) =>
  new Date(2026, 0, day, hours, minutes, 0, ms);

const build = (calendar: GanttCalendar) => buildCalendar(calendar, calendarKey(calendar));

const MIN = 60_000;
const HOUR = 3_600_000;

/** Mon–Fri, 8:00–17:00, no lunch. */
const officeHours = build({ hours: ['8:00-17:00'], days: { 0: false, 6: false } });
/** Mon–Fri, 8:00–12:00 and 13:00–17:00 — a lunch gap. */
const withLunch = build({
  hours: ['8:00-12:00', '13:00-17:00'],
  days: { 0: false, 6: false },
});
/** Whole days, weekends off — the day-granular calendar. */
const wholeDays = build({ days: { 0: false, 6: false } });

describe('isWorkingTime', () => {
  it('is half-open at the end of a range', () => {
    expect(isWorkingTime(officeHours, jan(5, 16, 59, 999))).toBe(true);
    expect(isWorkingTime(officeHours, jan(5, 17))).toBe(false);
  });

  it('is inclusive at the start of a range', () => {
    expect(isWorkingTime(officeHours, jan(5, 8))).toBe(true);
    expect(isWorkingTime(officeHours, jan(5, 7, 59))).toBe(false);
  });

  it('excludes a lunch gap', () => {
    expect(isWorkingTime(withLunch, jan(5, 12, 30))).toBe(false);
    expect(isWorkingTime(withLunch, jan(5, 13))).toBe(true);
  });

  it('excludes a weekend', () => {
    expect(isWorkingTime(officeHours, jan(3, 12))).toBe(false);
  });

  it('is always true with no calendar', () => {
    expect(isWorkingTime(null, jan(3, 3))).toBe(true);
  });
});

describe('closestWorkingTime', () => {
  it('projects a Saturday forward to Monday morning', () => {
    expect(closestWorkingTime(officeHours, jan(3, 12), 1)).toEqual(jan(5, 8));
  });

  it('projects a Saturday backward to Friday evening', () => {
    expect(closestWorkingTime(officeHours, jan(3, 12), -1)).toEqual(jan(2, 17));
  });

  it('leaves a working instant untouched in both directions', () => {
    expect(closestWorkingTime(officeHours, jan(5, 10), 1)).toEqual(jan(5, 10));
    expect(closestWorkingTime(officeHours, jan(5, 10), -1)).toEqual(jan(5, 10));
  });

  it('treats the end of a range as a valid finish but not a valid start', () => {
    expect(closestWorkingTime(officeHours, jan(5, 17), -1)).toEqual(jan(5, 17));
    expect(closestWorkingTime(officeHours, jan(5, 17), 1)).toEqual(jan(6, 8));
  });

  it('crosses a lunch gap', () => {
    expect(closestWorkingTime(withLunch, jan(5, 12, 30), 1)).toEqual(jan(5, 13));
    expect(closestWorkingTime(withLunch, jan(5, 12, 30), -1)).toEqual(jan(5, 12));
  });

  it('skips a holiday run', () => {
    const calendar = build({
      hours: ['8:00-17:00'],
      days: { 0: false, 6: false },
      dates: { '2026-01-05': false, '2026-01-06': false },
    });
    expect(closestWorkingTime(calendar, jan(3, 12), 1)).toEqual(jan(7, 8));
  });

  it('is idempotent in each direction', () => {
    // The dependency cascade compares instants strictly, so a non-idempotent
    // projection would keep satisfying `earliest > start` and silently exhaust the
    // iteration guard, producing a wrong-but-stable schedule.
    for (const probe of [jan(3, 12), jan(5, 12, 30), jan(5, 8), jan(5, 17), jan(5, 10)]) {
      for (const dir of [1, -1] as const) {
        const once = closestWorkingTime(withLunch, probe, dir);
        expect(closestWorkingTime(withLunch, once, dir)).toEqual(once);
      }
    }
  });

  it('degrades to identity for a calendar with no working time', () => {
    const dead = build({ hours: false });
    expect(closestWorkingTime(dead, jan(5, 10), 1)).toEqual(jan(5, 10));
  });
});

describe('nearestWorkingTime', () => {
  it('picks the closer side of a weekend', () => {
    expect(nearestWorkingTime(officeHours, jan(3, 1))).toEqual(jan(2, 17)); // Sat 01:00 → Fri
    expect(nearestWorkingTime(officeHours, jan(4, 23))).toEqual(jan(5, 8)); // Sun 23:00 → Mon
  });

  it('leaves a working instant alone', () => {
    expect(nearestWorkingTime(officeHours, jan(5, 10))).toEqual(jan(5, 10));
  });
});

describe('addWorkingMs', () => {
  it('walks within a single day', () => {
    expect(addWorkingMs(officeHours, jan(5, 9), 2 * HOUR)).toEqual(jan(5, 11));
  });

  it('carries across a weekend', () => {
    expect(addWorkingMs(officeHours, jan(2, 16), 2 * HOUR)).toEqual(jan(5, 9));
  });

  it('skips a lunch gap', () => {
    // 11:00 + 2 working hours = 11:00→12:00, then 13:00→14:00.
    expect(addWorkingMs(withLunch, jan(5, 11), 2 * HOUR)).toEqual(jan(5, 14));
  });

  it('lands on a range end rather than the next range start', () => {
    // Having worked through to the break, you finish at 12:00 — you do not start at 13:00.
    expect(addWorkingMs(withLunch, jan(5, 8), 4 * HOUR)).toEqual(jan(5, 12));
  });

  it('walks backward to a range start rather than the previous range end', () => {
    expect(addWorkingMs(withLunch, jan(5, 17), -4 * HOUR)).toEqual(jan(5, 13));
  });

  it('skips a holiday', () => {
    const calendar = build({
      hours: ['8:00-17:00'],
      days: { 0: false, 6: false },
      dates: { '2026-01-06': false },
    });
    expect(addWorkingMs(calendar, jan(5, 16), 2 * HOUR)).toEqual(jan(7, 9));
  });

  it('honours a half-day override', () => {
    const calendar = build({
      hours: ['8:00-17:00'],
      days: { 0: false, 6: false },
      dates: { '2026-01-06': ['8:00-12:00'] },
    });
    expect(addWorkingMs(calendar, jan(6, 8), 5 * HOUR)).toEqual(jan(7, 9));
  });

  it('is linear with no calendar', () => {
    expect(addWorkingMs(null, jan(3, 12), 2 * HOUR)).toEqual(jan(3, 14));
  });

  it('matches a naive day-by-day reference across a long span', () => {
    // Exercises the whole-week skip against the unaccelerated definition.
    const calendar = build({
      hours: ['8:00-17:00'],
      days: { 0: false, 6: false },
      dates: { '2026-06-15': false },
    });
    const start = jan(5, 8);
    for (const days of [1, 5, 20, 120, 400]) {
      const ms = days * 9 * HOUR;
      let naive = start;
      for (let i = 0; i < days; i++) {
        naive = addWorkingMs(calendar, naive, 9 * HOUR);
      }
      expect(addWorkingMs(calendar, start, ms)).toEqual(naive);
    }
  });
});

describe('addWorkingMs — anchor projection is intentionally lossy', () => {
  // ADR-007. These assertions pin a deliberate asymmetry: a walk's meaning depends
  // on whether it is computing a START or a FINISH, so projecting a non-working
  // anchor cannot be direction-neutral. If a future change makes these round-trip,
  // the convention was broken by accident — do not "fix" the test.
  const saturday = jan(3, 12);

  it('projects a zero-length walk forward or backward as the caller asks', () => {
    expect(addWorkingMs(officeHours, saturday, 0, 1)).toEqual(jan(5, 8));
    expect(addWorkingMs(officeHours, saturday, 0, -1)).toEqual(jan(2, 17));
  });

  it('does NOT round-trip from a non-working anchor', () => {
    const there = addWorkingMs(officeHours, saturday, 8 * HOUR);
    expect(addWorkingMs(officeHours, there, -8 * HOUR)).toEqual(jan(5, 8));
    expect(addWorkingMs(officeHours, there, -8 * HOUR)).not.toEqual(saturday);
  });

  it('lands on different days walking each way from the same non-working anchor', () => {
    const forwardThenBack = addWorkingMs(
      officeHours,
      addWorkingMs(officeHours, saturday, 5 * HOUR),
      -5 * HOUR,
    );
    const backThenForward = addWorkingMs(
      officeHours,
      addWorkingMs(officeHours, saturday, -5 * HOUR),
      5 * HOUR,
    );
    expect(forwardThenBack).toEqual(jan(5, 8));
    expect(backThenForward).toEqual(jan(2, 17));
    expect(forwardThenBack).not.toEqual(backThenForward);
  });

  describe('the round-trip rule', () => {
    // Round-trip holds IFF the anchor is anchored in the direction of the FIRST walk.
    // Note this is stricter than "holds from working time": 13:00 is working, yet a
    // backward-first walk from it does not return.
    const cases = [
      { name: 'interior', at: jan(5, 10), forward: true, backward: true },
      { name: 'range start (working, forward-anchored only)', at: jan(5, 8), forward: true, backward: false },
      { name: 'range end (working, backward-anchored only)', at: jan(5, 17), forward: false, backward: true },
      { name: 'after a lunch gap (forward-anchored only)', at: jan(5, 13), forward: true, backward: false },
      { name: 'inside a lunch gap (neither)', at: jan(5, 12, 30), forward: false, backward: false },
      { name: 'weekend (neither)', at: jan(3, 12), forward: false, backward: false },
    ];

    for (const { name, at, forward, backward } of cases) {
      it(`${forward ? 'round-trips' : 'does not round-trip'} forward-first from ${name}`, () => {
        const result = addWorkingMs(withLunch, addWorkingMs(withLunch, at, 2 * HOUR), -2 * HOUR);
        if (forward) {
          expect(result).toEqual(at);
        } else {
          expect(result).not.toEqual(at);
        }
      });

      it(`${backward ? 'round-trips' : 'does not round-trip'} backward-first from ${name}`, () => {
        const result = addWorkingMs(withLunch, addWorkingMs(withLunch, at, -2 * HOUR), 2 * HOUR);
        if (backward) {
          expect(result).toEqual(at);
        } else {
          expect(result).not.toEqual(at);
        }
      });
    }
  });
});

describe('countWorkingMs', () => {
  it('counts a partial day', () => {
    expect(countWorkingMs(officeHours, jan(5, 9), jan(5, 12))).toBe(3 * HOUR);
  });

  it('excludes a lunch gap', () => {
    expect(countWorkingMs(withLunch, jan(5, 11), jan(5, 14))).toBe(2 * HOUR);
  });

  it('excludes a weekend', () => {
    expect(countWorkingMs(officeHours, jan(2, 16), jan(5, 9))).toBe(2 * HOUR);
  });

  it('is zero across a whole weekend', () => {
    expect(countWorkingMs(officeHours, jan(3), jan(5))).toBe(0);
  });

  it('is negative when the range runs backward', () => {
    expect(countWorkingMs(officeHours, jan(5, 12), jan(5, 9))).toBe(-3 * HOUR);
  });

  it('is additive across any split point', () => {
    const a = jan(2, 9);
    const b = jan(3, 4); // inside the weekend
    const c = jan(7, 15);
    expect(countWorkingMs(withLunch, a, b) + countWorkingMs(withLunch, b, c)).toBe(
      countWorkingMs(withLunch, a, c),
    );
  });

  it('inverts addWorkingMs from a working anchor', () => {
    const start = jan(5, 8);
    for (const hours of [1, 4, 9, 40, 200]) {
      const end = addWorkingMs(withLunch, start, hours * HOUR);
      expect(countWorkingMs(withLunch, start, end)).toBe(hours * HOUR);
    }
  });

  it('matches a naive day-by-day reference over a year', () => {
    const calendar = build({
      hours: ['8:00-17:00'],
      days: { 0: false, 6: false },
      dates: { '2026-01-01': false, '2026-12-25': false },
    });
    const from = new Date(2026, 0, 1);
    const to = new Date(2027, 0, 1);
    let naive = 0;
    for (let d = new Date(from); d < to; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      naive += countWorkingMs(calendar, d, new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
    }
    expect(countWorkingMs(calendar, from, to)).toBe(naive);
  });

  it('is elapsed time with no calendar', () => {
    expect(countWorkingMs(null, jan(3), jan(5))).toBe(2 * 24 * HOUR);
  });
});

describe('isNonWorkingSpan', () => {
  it('is true for a weekend day', () => {
    expect(isNonWorkingSpan(officeHours, jan(3), jan(4))).toBe(true);
  });

  it('is false for a working day', () => {
    expect(isNonWorkingSpan(officeHours, jan(5), jan(6))).toBe(false);
  });

  it('is true for an off-hours slice of a working day', () => {
    expect(isNonWorkingSpan(officeHours, jan(5, 18), jan(5, 19))).toBe(true);
  });

  it('is false with no calendar', () => {
    expect(isNonWorkingSpan(null, jan(3), jan(4))).toBe(false);
  });
});

describe('working-time units', () => {
  it('treats one day as the longest working day', () => {
    expect(workingMsPerUnit(wholeDays, 'day')).toBe(24 * HOUR);
    expect(workingMsPerUnit(officeHours, 'day')).toBe(9 * HOUR);
    expect(workingMsPerUnit(withLunch, 'day')).toBe(8 * HOUR);
  });

  it('uses fixed hour and minute units', () => {
    expect(workingMsPerUnit(withLunch, 'hour')).toBe(HOUR);
    expect(workingMsPerUnit(withLunch, 'minute')).toBe(MIN);
  });

  it('falls back to a calendar day with no calendar', () => {
    expect(workingMsPerUnit(null, 'day')).toBe(24 * HOUR);
  });

  it('advances three whole working days on a day-granular calendar', () => {
    expect(addWorkingUnits(wholeDays, jan(5), 3, 'day')).toEqual(jan(8));
  });

  it('advances three working days across a weekend', () => {
    expect(addWorkingUnits(wholeDays, jan(8), 3, 'day')).toEqual(jan(13));
  });
});

describe('DST', () => {
  // Zone-agnostic: asserted against local civil midnights, so it holds wherever the
  // suite runs and needs no TZ pinning. Working time is CIVIL time — a spring-forward
  // day is 23 hours long and still counts as one full working day.
  const allDays = build({});

  it('lands on the next local midnight after one full working day, every day of a year', () => {
    const oneDay = workingMsPerUnit(allDays, 'day');
    for (let day = 0; day < 365; day++) {
      const midnight = new Date(2026, 0, 1 + day);
      const next = new Date(2026, 0, 2 + day);
      expect(addWorkingMs(allDays, midnight, oneDay)).toEqual(next);
    }
  });

  it('counts one full working day between consecutive local midnights, every day of a year', () => {
    const oneDay = workingMsPerUnit(allDays, 'day');
    for (let day = 0; day < 365; day++) {
      const midnight = new Date(2026, 0, 1 + day);
      const next = new Date(2026, 0, 2 + day);
      expect(countWorkingMs(allDays, midnight, next)).toBe(oneDay);
    }
  });
});
