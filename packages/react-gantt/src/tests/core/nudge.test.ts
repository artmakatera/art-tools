import { describe, expect, it } from 'vitest';
import { nudgeTask } from '../../core/nudge';
import { DEFAULT_ZOOM_LEVELS } from '../../core/zoom';
import { resolveColumnStep, resolveColumnUnit } from '../../core/scales';
import { diffDays } from '../../core/dateUtils';
import type { CalendarUnit, GanttTask } from '../../types';

const task = (over: Partial<GanttTask> = {}): GanttTask => ({
  id: 't',
  name: 'Task',
  startDate: new Date(2026, 0, 1),
  endDate: new Date(2026, 0, 31),
  ...over,
});

const NOT_SUMMARY = { isDerivedSummary: false };

/** Every rung of the shipped zoom ladder, so nudge is proven at each column unit. */
const rungs = DEFAULT_ZOOM_LEVELS.map((level) => ({
  unit: resolveColumnUnit(level.scales),
  step: resolveColumnStep(level.scales),
}));

describe('nudgeTask', () => {
  describe('round-trips exactly at every zoom rung', () => {
    for (const { unit, step } of rungs) {
      it(`${unit} x${step}`, () => {
        const original = task();
        const right = nudgeTask(original, 'move', unit, step, 1, NOT_SUMMARY);
        expect(right.patch).toBeDefined();

        const moved = task({
          startDate: right.patch!.startDate,
          endDate: right.patch!.endDate,
        });
        const back = nudgeTask(moved, 'move', unit, step, -1, NOT_SUMMARY);

        // The regression this guards: the pixel route (moveAt(left ± colWidth))
        // returned Feb 1–28 for a Jan 1–31 task at the month rung, so `←` after
        // `→` did not restore the original dates.
        expect(back.patch!.startDate).toEqual(original.startDate);
        expect(back.patch!.endDate).toEqual(original.endDate);
      });
    }
  });

  describe('preserves duration at every zoom rung', () => {
    for (const { unit, step } of rungs) {
      it(`${unit} x${step}`, () => {
        const original = task();
        const span = diffDays(original.startDate, original.endDate!);
        let current = original;
        for (let i = 0; i < 6; i += 1) {
          const { patch } = nudgeTask(current, 'move', unit, step, 1, NOT_SUMMARY);
          current = task({ startDate: patch!.startDate, endDate: patch!.endDate });
          expect(diffDays(current.startDate, current.endDate!)).toBe(span);
        }
      });
    }
  });

  it('moves by whole calendar units, not fixed day counts', () => {
    const { patch } = nudgeTask(
      task({ startDate: new Date(2026, 0, 15), endDate: new Date(2026, 0, 20) }),
      'move',
      'month',
      1,
      1,
      NOT_SUMMARY,
    );
    expect(patch!.startDate).toEqual(new Date(2026, 1, 15));
    expect(patch!.endDate).toEqual(new Date(2026, 1, 20));
  });

  it('honours a multi-unit column step', () => {
    const { patch } = nudgeTask(task(), 'move', 'day', 7, 1, NOT_SUMMARY);
    expect(patch!.startDate).toEqual(new Date(2026, 0, 8));
  });

  describe('sub-day column units clamp to a whole day', () => {
    // Task positions are day-granular (computeTaskPixels normalizes both edges
    // to startOfUnit(_, 'day')), so an hour-sized nudge would write precision
    // the renderer throws away: the bar would not move, and the opposite arrow
    // would not return to the starting date.
    it('nudges by a day at the hour rung', () => {
      const { patch } = nudgeTask(task(), 'move', 'hour', 1, 1, NOT_SUMMARY);
      expect(patch!.startDate).toEqual(new Date(2026, 0, 2));
      expect(patch!.startDate!.getHours()).toBe(0);
    });

    it('nudges by a day at the minute rung', () => {
      const { patch } = nudgeTask(task(), 'move', 'minute', 30, 1, NOT_SUMMARY);
      expect(patch!.startDate).toEqual(new Date(2026, 0, 2));
    });
  });

  it('reads duration-only tasks through the same resolution as the bar', () => {
    const { patch } = nudgeTask(
      { id: 'd', name: 'd', startDate: new Date(2026, 0, 1), duration: 5 },
      'move',
      'day',
      1,
      1,
      NOT_SUMMARY,
    );
    expect(patch!.startDate).toEqual(new Date(2026, 0, 2));
    // duration 5 → Jan 1..5 inclusive, so the moved span is Jan 2..6.
    expect(patch!.endDate).toEqual(new Date(2026, 0, 6));
  });

  describe('resizing', () => {
    it('moves only the end edge', () => {
      const { patch } = nudgeTask(task(), 'end', 'day', 1, 1, NOT_SUMMARY);
      expect(patch).toEqual({ endDate: new Date(2026, 1, 1) });
    });

    it('moves only the start edge', () => {
      const { patch } = nudgeTask(task(), 'start', 'day', 1, 1, NOT_SUMMARY);
      expect(patch).toEqual({ startDate: new Date(2026, 0, 2) });
    });

    it('refuses to pull the end before the start', () => {
      const oneDay = task({
        startDate: new Date(2026, 0, 1),
        endDate: new Date(2026, 0, 1),
      });
      expect(nudgeTask(oneDay, 'end', 'day', 1, -1, NOT_SUMMARY).refusal).toBe(
        'would-invert',
      );
    });

    it('refuses to push the start past the end', () => {
      const oneDay = task({
        startDate: new Date(2026, 0, 1),
        endDate: new Date(2026, 0, 1),
      });
      expect(nudgeTask(oneDay, 'start', 'day', 1, 1, NOT_SUMMARY).refusal).toBe(
        'would-invert',
      );
    });

    it('allows collapsing to exactly one day', () => {
      const twoDay = task({
        startDate: new Date(2026, 0, 1),
        endDate: new Date(2026, 0, 2),
      });
      expect(nudgeTask(twoDay, 'end', 'day', 1, -1, NOT_SUMMARY).patch).toEqual({
        endDate: new Date(2026, 0, 1),
      });
    });
  });

  describe('milestones', () => {
    const milestone = task({ type: 'milestone', endDate: undefined });

    it('moves without acquiring an end date', () => {
      const { patch } = nudgeTask(milestone, 'move', 'day', 1, 1, NOT_SUMMARY);
      expect(patch).toEqual({ startDate: new Date(2026, 0, 2) });
      expect(patch).not.toHaveProperty('endDate');
    });

    it('cannot be resized from either edge', () => {
      expect(nudgeTask(milestone, 'start', 'day', 1, 1, NOT_SUMMARY).refusal).toBe(
        'milestone-resize',
      );
      expect(nudgeTask(milestone, 'end', 'day', 1, 1, NOT_SUMMARY).refusal).toBe(
        'milestone-resize',
      );
    });
  });

  it('refuses a derived summary rather than writing a doomed transaction', () => {
    // Summary dates are recomputed from children, so the write would be
    // reverted on the next render while still costing an undo step.
    const summary = task({ type: 'summary' });
    const result = nudgeTask(summary, 'move', 'day', 1, 1, {
      isDerivedSummary: true,
    });
    expect(result.refusal).toBe('derived-summary');
    expect(result.patch).toBeUndefined();
  });

  it('moves a childless summary normally', () => {
    const summary = task({ type: 'summary' });
    expect(nudgeTask(summary, 'move', 'day', 1, 1, NOT_SUMMARY).patch).toBeDefined();
  });

  describe('DST', () => {
    // The column unit is finer than a day at the hour rung, where a naive
    // implementation would drift by an hour across a transition.
    const units: CalendarUnit[] = ['day', 'week', 'month'];
    for (const unit of units) {
      it(`stays on local midnight stepping ${unit} across a fall-back boundary`, () => {
        let current = task({
          startDate: new Date(2026, 9, 28),
          endDate: new Date(2026, 9, 30),
        });
        for (let i = 0; i < 4; i += 1) {
          const { patch } = nudgeTask(current, 'move', unit, 1, 1, NOT_SUMMARY);
          expect(patch!.startDate!.getHours()).toBe(0);
          expect(patch!.endDate!.getHours()).toBe(0);
          current = task({ startDate: patch!.startDate, endDate: patch!.endDate });
        }
      });
    }
  });
});
