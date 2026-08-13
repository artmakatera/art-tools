import { describe, expect, it } from 'vitest';
import type { BarCommit } from '../../core/barUtils';
import { buildCalendar, calendarKey } from '../../core/calendar';
import { resolveCommit } from '../../core/scheduling';
import { LINEAR_CONTEXT, type SchedulingContext } from '../../core/taskDates';
import { countWorkingMs } from '../../core/workingTime';
import type { GanttCalendar, GanttTask } from '../../types';

// Jan 2026: Jan 1 Thu, Jan 2 Fri, Jan 3 Sat, Jan 4 Sun, Jan 5 Mon, Jan 6 Tue,
// Jan 7 Wed, Jan 8 Thu, Jan 9 Fri, Jan 10 Sat, Jan 12 Mon.
const jan = (day: number, hours = 0, minutes = 0) => new Date(2026, 0, day, hours, minutes);

const ctxFor = (
  calendar: GanttCalendar,
  overrides: Partial<SchedulingContext> = {},
): SchedulingContext => ({
  calendar: buildCalendar(calendar, calendarKey(calendar)),
  durationUnit: 'day',
  snapToWorking: true,
  ...overrides,
});

const weekdays = ctxFor({ days: { 0: false, 6: false } });

const task = (props: Partial<GanttTask> = {}): GanttTask => ({
  id: 't',
  name: 't',
  startDate: jan(5),
  endDate: jan(8), // Mon..Wed — three working days
  ...props,
});

const move = (startDate: Date): BarCommit => ({ kind: 'move', startDate });

describe('resolveCommit — move', () => {
  it('preserves working time rather than pixel width', () => {
    // Three working days dropped on Thursday must still be three working days,
    // so the span grows across the weekend: Thu, Fri, Mon.
    const { startDate, endDate } = resolveCommit(task(), move(jan(1)), weekdays);
    expect(startDate).toEqual(jan(1));
    expect(endDate).toEqual(jan(6));
    expect(countWorkingMs(weekdays.calendar, startDate, endDate)).toBe(
      countWorkingMs(weekdays.calendar, jan(5), jan(8)),
    );
  });

  it('snaps a start forward onto a working day', () => {
    // ADR-020: starts always project forward, whichever way the drag went.
    const { startDate } = resolveCommit(task(), move(jan(3)), weekdays);
    expect(startDate).toEqual(jan(5));
  });

  it('snaps forward even when the drag went backward', () => {
    const { startDate } = resolveCommit(task({ startDate: jan(12), endDate: jan(15) }), move(jan(10)), weekdays);
    expect(startDate).toEqual(jan(12));
  });

  it('leaves the date alone when snapping is off', () => {
    const ctx = ctxFor({ days: { 0: false, 6: false } }, { snapToWorking: false });
    const { startDate } = resolveCommit(task(), move(jan(3)), ctx);
    expect(startDate).toEqual(jan(3));
  });

  it('preserves the calendar span with no calendar at all', () => {
    const { startDate, endDate } = resolveCommit(task(), move(jan(10)), LINEAR_CONTEXT);
    expect(startDate).toEqual(jan(10));
    expect(endDate).toEqual(jan(13)); // same 3-day span, weekends included
  });

  it('keeps a milestone an instant', () => {
    const milestone = task({ type: 'milestone', endDate: undefined });
    const { startDate, endDate } = resolveCommit(milestone, move(jan(3)), weekdays);
    expect(startDate).toEqual(endDate);
  });
});

describe('resolveCommit — resize', () => {
  it('settles an end dropped on a weekend back onto the last working day', () => {
    const { startDate, endDate } = resolveCommit(
      task(),
      { kind: 'resizeEnd', endDate: jan(11) }, // dropped on Sunday
      weekdays,
    );
    expect(startDate).toEqual(jan(5));
    expect(endDate).toEqual(jan(10)); // end of Friday's work
  });

  it('does not move the untouched edge when the start handle is dragged', () => {
    // The old path snapped left and width independently, so dragging the start
    // handle could shift the far edge by a whole column.
    const original = task();
    const { startDate, endDate } = resolveCommit(
      original,
      { kind: 'resizeStart', startDate: jan(6) },
      weekdays,
    );
    expect(startDate).toEqual(jan(6));
    expect(endDate).toEqual(original.endDate);
  });

  it('clamps a collapsed resize to one working unit', () => {
    const { startDate, endDate } = resolveCommit(
      task(),
      { kind: 'resizeEnd', endDate: jan(1) }, // dragged left past the start
      weekdays,
    );
    expect(countWorkingMs(weekdays.calendar, startDate, endDate)).toBeGreaterThan(0);
  });

  it('anchors the clamp on the edge the user was not dragging', () => {
    const { startDate, endDate } = resolveCommit(
      task(),
      { kind: 'resizeStart', startDate: jan(12) }, // dragged right past the end
      weekdays,
    );
    expect(endDate).toEqual(task().endDate);
    expect(startDate.getTime()).toBeLessThan(endDate.getTime());
  });
});

describe('resolveCommit — working hours', () => {
  const office = ctxFor(
    { hours: ['8:00-12:00', '13:00-17:00'], days: { 0: false, 6: false } },
    { durationUnit: 'hour' },
  );

  it('carries a move across a lunch gap', () => {
    // Two working hours starting 11:00 spans 11:00→12:00 and 13:00→14:00.
    const twoHours = task({ startDate: jan(5, 8), endDate: jan(5, 10) });
    const { startDate, endDate } = resolveCommit(twoHours, move(jan(5, 11)), office);
    expect(startDate).toEqual(jan(5, 11));
    expect(endDate).toEqual(jan(5, 14));
  });

  it('snaps a start dropped in the lunch gap forward to the afternoon', () => {
    const twoHours = task({ startDate: jan(5, 8), endDate: jan(5, 10) });
    const { startDate } = resolveCommit(twoHours, move(jan(5, 12, 30)), office);
    expect(startDate).toEqual(jan(5, 13));
  });
});
