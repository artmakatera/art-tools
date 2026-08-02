import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ZOOM_INDEX,
  DEFAULT_ZOOM_LEVELS,
  resolveZoomLevels,
} from '../../core/zoom';
import { resolveColumnUnit } from '../../core/scales';
import type { Scale } from '../../types';

const scale = (unit: Scale['unit'], step = 1): Scale => ({ unit, step, format: () => '' });

describe('DEFAULT_ZOOM_LEVELS', () => {
  it('is ordered coarse → fine by column unit', () => {
    const units = DEFAULT_ZOOM_LEVELS.map((l) => resolveColumnUnit(l.scales));
    expect(units).toEqual(['quarter', 'month', 'week', 'day', 'hour']);
  });

  it('DEFAULT_ZOOM_INDEX points to the day rung', () => {
    expect(resolveColumnUnit(DEFAULT_ZOOM_LEVELS[DEFAULT_ZOOM_INDEX]!.scales)).toBe('day');
  });

  it('every rung has a positive colWidth', () => {
    expect(DEFAULT_ZOOM_LEVELS.every((l) => l.colWidth > 0)).toBe(true);
  });
});

describe('resolveZoomLevels', () => {
  it('returns the default ladder when nothing is provided', () => {
    expect(resolveZoomLevels(undefined, undefined, undefined)).toBe(DEFAULT_ZOOM_LEVELS);
  });

  it('returns a custom ladder verbatim', () => {
    const custom = [{ scales: [scale('day')], colWidth: 20 }];
    expect(resolveZoomLevels(custom, undefined, undefined)).toBe(custom);
  });

  it('seeds the default rung with standalone scales/colWidth', () => {
    const scales = [scale('month'), scale('day')];
    const levels = resolveZoomLevels(undefined, scales, 99);
    expect(levels[DEFAULT_ZOOM_INDEX]!.colWidth).toBe(99);
    expect(levels[DEFAULT_ZOOM_INDEX]!.scales).toBe(scales);
    expect(levels[0]).toBe(DEFAULT_ZOOM_LEVELS[0]); // other rungs untouched
  });

  it('overrides only colWidth when scales are omitted', () => {
    const levels = resolveZoomLevels(undefined, undefined, 72);
    expect(levels[DEFAULT_ZOOM_INDEX]!.colWidth).toBe(72);
    expect(resolveColumnUnit(levels[DEFAULT_ZOOM_INDEX]!.scales)).toBe('day');
  });
});
