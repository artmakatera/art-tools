import { describe, expect, it } from 'vitest';
import { computeTaskPixels, pxToDate } from '../../core/barUtils';
import type { GanttTask } from '../../types';

// `endDate` is an EXCLUSIVE instant (ADR-014): a task covering Jan 1..3 stores
// Jan 4. The display list materializes it on every task, so these fixtures carry
// it explicitly rather than relying on the fallback.
const task = (startDate: Date, endDate?: Date): GanttTask => ({
  id: 't',
  name: 't',
  startDate,
  endDate,
});

const COL = 40;

describe('computeTaskPixels', () => {
  describe('day unit', () => {
    it('places and sizes a multi-day span', () => {
      const { left, width } = computeTaskPixels(
        task(new Date(2026, 0, 1), new Date(2026, 0, 4)), // covers Jan 1..3
        {},
        new Date(2026, 0, 1),
        COL,
        'day',
      );
      expect(left).toBe(0);
      expect(width).toBe(3 * COL);
    });

    it('draws a one-day task as exactly one column', () => {
      const { left, width } = computeTaskPixels(
        task(new Date(2026, 0, 4), new Date(2026, 0, 5)),
        {},
        new Date(2026, 0, 1),
        COL,
        'day',
      );
      expect(left).toBe(3 * COL);
      expect(width).toBe(COL);
    });

    it('draws a task whose end equals its start as zero width', () => {
      // A milestone, or a task not yet resolved through the display list. The
      // geometry stays an exact inverse; any minimum width is a rendering concern.
      const { width } = computeTaskPixels(
        task(new Date(2026, 0, 4), new Date(2026, 0, 4)),
        {},
        new Date(2026, 0, 1),
        COL,
        'day',
      );
      expect(width).toBe(0);
    });

    it('positions an intraday task by its time of day', () => {
      // Previously floored to midnight; instants are now honoured (ADR-014).
      const { left, width } = computeTaskPixels(
        task(new Date(2026, 0, 1, 6), new Date(2026, 0, 1, 18)),
        {},
        new Date(2026, 0, 1),
        COL,
        'day',
      );
      expect(left).toBeCloseTo(COL / 4, 6);
      expect(width).toBeCloseTo(COL / 2, 6);
    });
  });

  describe('month unit (true-scale, proportional widths)', () => {
    const origin = new Date(2026, 0, 1);

    it('sizes a task by its real duration, not a whole column', () => {
      // Jan 1 .. Mar 31 inclusive = all of Q1 = exactly 3 month columns.
      const { left, width } = computeTaskPixels(
        task(new Date(2026, 0, 1), new Date(2026, 3, 1)),
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
        task(new Date(2026, 0, 1), new Date(2026, 0, 2)),
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

  describe('quarter unit', () => {
    const origin = new Date(2026, 0, 1); // Q1 start

    it('draws a one-day task as ~1/90 of a column, not a whole quarter', () => {
      const { width } = computeTaskPixels(
        task(new Date(2026, 0, 1), new Date(2026, 0, 2)),
        {},
        origin,
        COL,
        'quarter',
      );
      // Q1 2026 ≈ 90 days → a sub-pixel sliver, far less than a whole column.
      expect(width).toBeCloseTo(COL / 90, 1);
      expect(width).toBeLessThan(1);
    });

    it('draws a full quarter as exactly one column', () => {
      const { width } = computeTaskPixels(
        task(new Date(2026, 0, 1), new Date(2026, 3, 1)),
        {},
        origin,
        COL,
        'quarter',
      );
      expect(width).toBeCloseTo(COL, 6);
    });
  });
});

describe('pxToDate', () => {
  it('maps a whole-column edge to a unit boundary (month)', () => {
    const d = pxToDate(3 * COL, new Date(2026, 0, 1), COL, 'month');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 3, 1]); // Apr 1
  });

  it('inverts computeTaskPixels at the right edge', () => {
    // With an exclusive end there is no ±1 day conversion between the two: the
    // right edge IS the end date.
    const origin = new Date(2026, 0, 1);
    const end = new Date(2026, 3, 1);
    const { left, width } = computeTaskPixels(
      task(origin, end),
      {},
      origin,
      COL,
      'month',
    );
    expect(pxToDate(left + width, origin, COL, 'month').getTime()).toBe(end.getTime());
  });
});
