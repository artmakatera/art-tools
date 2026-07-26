import { describe, expect, it } from 'vitest';
import { computeTaskPixels, pxToDate } from '../../core/barUtils';
import type { GanttTask } from '../../types';

const task = (startDate: Date, endDate?: Date): GanttTask => ({
  id: 't',
  name: 't',
  startDate,
  endDate,
});

const COL = 40;

describe('computeTaskPixels', () => {
  describe('day unit (unchanged behaviour)', () => {
    it('places and sizes an inclusive multi-day span', () => {
      const { left, width } = computeTaskPixels(
        task(new Date(2026, 0, 1), new Date(2026, 0, 3)),
        {},
        new Date(2026, 0, 1),
        COL,
        'day',
      );
      expect(left).toBe(0);
      expect(width).toBe(3 * COL); // Jan 1..3 inclusive = 3 columns
    });

    it('treats a task without endDate as one day wide', () => {
      const { left, width } = computeTaskPixels(
        task(new Date(2026, 0, 4)),
        {},
        new Date(2026, 0, 1),
        COL,
        'day',
      );
      expect(left).toBe(3 * COL);
      expect(width).toBe(COL);
    });
  });

  describe('month unit (calendar-accurate, snapped to unit)', () => {
    const origin = new Date(2026, 0, 1);

    it('makes a task touching N months exactly N columns wide', () => {
      const { left, width } = computeTaskPixels(
        task(new Date(2026, 0, 15), new Date(2026, 2, 20)), // mid-Jan .. mid-Mar
        {},
        origin,
        COL,
        'month',
      );
      expect(left).toBe(0); // snapped to Jan 1
      // Jan, Feb, Mar columns — not the old 30-day approximation, not a fractional bar.
      expect(width).toBe(3 * COL);
    });

    it('offsets a task starting in a later month by whole columns', () => {
      const { left, width } = computeTaskPixels(
        task(new Date(2026, 2, 5)), // March, no end
        {},
        origin,
        COL,
        'month',
      );
      expect(left).toBe(2 * COL); // Jan, Feb, then March column
      expect(width).toBe(COL);
    });
  });

  describe('hour unit', () => {
    const origin = new Date(2026, 0, 1, 0, 0);

    it('spans the hour columns a task touches', () => {
      const { left, width } = computeTaskPixels(
        task(new Date(2026, 0, 1, 9, 20), new Date(2026, 0, 1, 11, 40)),
        {},
        origin,
        COL,
        'hour',
      );
      expect(left).toBe(9 * COL); // snapped to 09:00
      expect(width).toBe(3 * COL); // 09, 10, 11
    });
  });
});

describe('pxToDate', () => {
  it('maps a whole-column edge to a unit boundary (month)', () => {
    const d = pxToDate(3 * COL, new Date(2026, 0, 1), COL, 'month');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 3, 1]); // Apr 1
  });

  it('maps a whole-column edge to a unit boundary (hour)', () => {
    const d = pxToDate(5 * COL, new Date(2026, 0, 1, 0, 0), COL, 'hour');
    expect([d.getHours(), d.getMinutes()]).toEqual([5, 0]);
  });
});
