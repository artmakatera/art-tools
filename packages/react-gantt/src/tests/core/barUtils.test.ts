import { describe, expect, it } from 'vitest';
import { computeTaskPixels, pxToDate, pxToEndDate } from '../../core/barUtils';
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

  describe('month unit (true-scale, proportional widths)', () => {
    const origin = new Date(2026, 0, 1);

    it('sizes a task by its real duration, not a whole column', () => {
      // Jan 1 .. Mar 31 = all of Q1 = exactly 3 month columns.
      const { left, width } = computeTaskPixels(
        task(new Date(2026, 0, 1), new Date(2026, 2, 31)),
        {},
        origin,
        COL,
        'month',
      );
      expect(left).toBe(0);
      expect(width).toBeCloseTo(3 * COL, 6);
    });

    it('draws a one-day task as a proportional sliver, not a full month', () => {
      const { left, width } = computeTaskPixels(
        task(new Date(2026, 0, 1)), // 1 day, no end
        {},
        origin,
        COL,
        'month',
      );
      expect(left).toBe(0);
      // Jan has 31 days → ~1/31 of a column, and strictly less than one column.
      expect(width).toBeCloseTo(COL / 31, 6);
      expect(width).toBeLessThan(COL);
    });

    it('positions a mid-month start at its fractional offset', () => {
      const { left } = computeTaskPixels(
        task(new Date(2026, 1, 15)), // Feb 15, Feb has 28 days in 2026
        {},
        origin,
        COL,
        'month',
      );
      expect(left).toBeCloseTo((1 + 14 / 28) * COL, 6);
    });
  });

  describe('quarter unit (the reported case)', () => {
    const origin = new Date(2026, 0, 1); // Q1 start

    it('draws a one-day task as ~1/90 of a column, not a whole quarter', () => {
      const { width } = computeTaskPixels(
        task(new Date(2026, 0, 1)), // 1 day
        {},
        origin,
        COL,
        'quarter',
      );
      // Q1 2026 ≈ 90 days → ~1/90 of a column (a sub-pixel sliver), and far
      // less than a whole column. (Loose tolerance: the span crosses a DST
      // boundary in some timezones, shifting it by an hour.)
      expect(width).toBeCloseTo(COL / 90, 1);
      expect(width).toBeLessThan(1);
    });

    it('draws a full quarter as exactly one column', () => {
      const { width } = computeTaskPixels(
        task(new Date(2026, 0, 1), new Date(2026, 2, 31)),
        {},
        origin,
        COL,
        'quarter',
      );
      expect(width).toBeCloseTo(COL, 6);
    });
  });
});

describe('pxToDate / pxToEndDate', () => {
  it('maps a whole-column edge to a unit boundary (month)', () => {
    const d = pxToDate(3 * COL, new Date(2026, 0, 1), COL, 'month');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 3, 1]); // Apr 1
  });

  it('derives the inclusive end date one day before the exclusive edge', () => {
    const d = pxToEndDate(3 * COL, new Date(2026, 0, 1), COL, 'month');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 31]); // Mar 31
  });
});
