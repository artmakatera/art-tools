import { describe, expect, it } from 'vitest';
import { buildCalendar, calendarKey } from '../../core/calendar';
import {
  displayEndDate,
  endInstantFromDisplayDate,
  endInstantOf,
  LINEAR_CONTEXT,
  type SchedulingContext,
} from '../../core/taskDates';
import type { GanttCalendar, GanttTask } from '../../types';

// Jan 2026: Jan 1 Thu, Jan 2 Fri, Jan 3 Sat, Jan 4 Sun, Jan 5 Mon, Jan 6 Tue.
const jan = (day: number, hours = 0) => new Date(2026, 0, day, hours);

const ctxFor = (calendar: GanttCalendar, durationUnit: SchedulingContext['durationUnit'] = 'day'): SchedulingContext => ({
  calendar: buildCalendar(calendar, calendarKey(calendar)),
  durationUnit,
  snapToWorking: true,
});

const task = (props: Partial<GanttTask>): GanttTask => ({
  id: 't',
  name: 't',
  startDate: jan(5),
  ...props,
});

describe('endInstantOf', () => {
  it('prefers an explicit endDate over duration', () => {
    expect(endInstantOf(task({ endDate: jan(9), duration: 99 }), LINEAR_CONTEXT)).toEqual(jan(9));
  });

  it('treats a task with neither endDate nor duration as an instant', () => {
    expect(endInstantOf(task({}), LINEAR_CONTEXT)).toEqual(jan(5));
  });

  it('walks a duration out in calendar days with no calendar', () => {
    // Exclusive: 3 days from Mon covers Mon/Tue/Wed and ends Thu 00:00.
    expect(endInstantOf(task({ duration: 3 }), LINEAR_CONTEXT)).toEqual(jan(8));
  });

  it('skips a weekend on a day-granular calendar', () => {
    const ctx = ctxFor({ days: { 0: false, 6: false } });
    // 3 working days from Thursday: Thu, Fri, Mon → ends Tue 00:00.
    expect(endInstantOf(task({ startDate: jan(1), duration: 3 }), ctx)).toEqual(jan(6));
  });

  it('walks a duration in working hours', () => {
    const ctx = ctxFor({ hours: ['8:00-17:00'], days: { 0: false, 6: false } }, 'hour');
    expect(endInstantOf(task({ startDate: jan(5, 8), duration: 4 }), ctx)).toEqual(jan(5, 12));
  });

  it('carries an hour duration across a weekend', () => {
    const ctx = ctxFor({ hours: ['8:00-17:00'], days: { 0: false, 6: false } }, 'hour');
    expect(endInstantOf(task({ startDate: jan(2, 16), duration: 2 }), ctx)).toEqual(jan(5, 9));
  });

  it('treats a milestone as an instant regardless of endDate', () => {
    const milestone = task({ type: 'milestone', endDate: jan(9) });
    expect(endInstantOf(milestone, LINEAR_CONTEXT)).toEqual(jan(5));
  });

  it('treats a zero duration as an instant', () => {
    expect(endInstantOf(task({ duration: 0 }), LINEAR_CONTEXT)).toEqual(jan(5));
  });
});

describe('displayEndDate', () => {
  it('shows the last occupied day, not the exclusive instant', () => {
    // Mon..Fri is stored as Sat 00:00 and must read as Friday.
    expect(displayEndDate(jan(5), jan(10))).toEqual(jan(9));
  });

  it('keeps an intraday end on its own day', () => {
    expect(displayEndDate(jan(2, 9), jan(2, 17))).toEqual(jan(2));
  });

  it('falls back to the start day for a zero-length span', () => {
    expect(displayEndDate(jan(5, 9), jan(5, 9))).toEqual(jan(5));
  });
});

describe('endInstantFromDisplayDate', () => {
  it('inverts displayEndDate for whole-day spans', () => {
    for (const day of [1, 5, 28, 31]) {
      const start = jan(1);
      const end = endInstantFromDisplayDate(jan(day));
      expect(displayEndDate(start, end)).toEqual(jan(day));
    }
  });

  it('crosses a month boundary', () => {
    expect(endInstantFromDisplayDate(new Date(2026, 0, 31))).toEqual(new Date(2026, 1, 1));
  });
});
