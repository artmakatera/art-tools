import { createRef } from 'react';
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Gantt } from '../../Gantt';
import { getParentTaskData } from '../../core/prepareData';
import { computeDependencyLinks } from '../../components/dependency-links/geometry';
import type { GanttHandle, GanttTask, Scale } from '../../types';

/**
 * Guards the work in "the calendar header no longer re-renders on every edit".
 *
 * These are behavioural stand-ins for a benchmark: each asserts that an edit
 * which cannot affect a given derived value does not recompute it. They fail
 * loudly if the memoization is dropped, which a timing assertion could not do
 * reliably in CI.
 */

const tasks: GanttTask[] = [
  {
    id: 'p',
    name: 'Phase',
    type: 'summary',
    startDate: new Date(2026, 0, 1),
    endDate: new Date(2026, 0, 20),
    parentId: null,
  },
  {
    id: '1',
    name: 'Design',
    startDate: new Date(2026, 0, 1),
    endDate: new Date(2026, 0, 10),
    progress: 40,
    parentId: 'p',
  },
  {
    id: '2',
    name: 'Build',
    startDate: new Date(2026, 0, 10),
    endDate: new Date(2026, 0, 20),
    progress: 10,
    parentId: 'p',
  },
];

describe('updateTask does not redo work it cannot have invalidated', () => {
  it('does not re-format the calendar header when an edit leaves the timeline alone', () => {
    const monthFormat = vi.fn((d: Date) => String(d.getMonth()));
    const dayFormat = vi.fn((d: Date) => String(d.getDate()));
    // Module-stable identity, exactly as a consumer should pass it.
    const scales: Scale[] = [
      { unit: 'month', step: 1, format: monthFormat },
      { unit: 'day', step: 1, format: dayFormat },
    ];
    const apiRef = createRef<GanttHandle>();

    render(<Gantt tasks={tasks} height={400} scales={scales} apiRef={apiRef} />);

    expect(dayFormat).toHaveBeenCalled();
    monthFormat.mockClear();
    dayFormat.mockClear();

    act(() => {
      apiRef.current!.updateTask('1', { progress: 95 });
    });

    expect(dayFormat).not.toHaveBeenCalled();
    expect(monthFormat).not.toHaveBeenCalled();
  });

  it('does re-format the header when an edit actually moves the timeline', () => {
    const dayFormat = vi.fn((d: Date) => String(d.getDate()));
    const scales: Scale[] = [
      { unit: 'month', step: 1, format: (d) => String(d.getMonth()) },
      { unit: 'day', step: 1, format: dayFormat },
    ];
    const apiRef = createRef<GanttHandle>();

    render(<Gantt tasks={tasks} height={400} scales={scales} apiRef={apiRef} />);
    dayFormat.mockClear();

    act(() => {
      apiRef.current!.updateTask('2', {
        startDate: new Date(2026, 0, 10),
        endDate: new Date(2026, 2, 1),
      });
    });

    expect(dayFormat).toHaveBeenCalled();
  });
});

describe('getParentTaskData preserves identity', () => {
  const children: GanttTask[] = [
    { id: 'a', name: 'a', startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 10), progress: 40 },
    { id: 'b', name: 'b', startDate: new Date(2026, 0, 10), endDate: new Date(2026, 0, 20), progress: 60 },
  ];

  it('returns the same object when the roll-up matches what the summary already says', () => {
    const parent: GanttTask = {
      id: 'p',
      name: 'Phase',
      type: 'summary',
      startDate: new Date(2026, 0, 1),
      endDate: new Date(2026, 0, 20),
      progress: 50,
    };
    expect(getParentTaskData(parent, children)).toBe(parent);
  });

  it('returns a new object when the roll-up differs', () => {
    const parent: GanttTask = {
      id: 'p',
      name: 'Phase',
      type: 'summary',
      startDate: new Date(2026, 0, 1),
      endDate: new Date(2026, 0, 20),
      progress: 0,
    };
    const rolled = getParentTaskData(parent, children);
    expect(rolled).not.toBe(parent);
    expect(rolled.progress).toBe(50);
  });
});

describe('computeDependencyLinks skips geometry it cannot use', () => {
  const params = {
    tasks,
    origin: new Date(2026, 0, 1),
    colWidth: 40,
    rowHeight: 36,
    unit: 'day' as const,
    overrides: {},
  };

  it('returns a stable empty array without pricing any task when there are no dependencies', () => {
    const first = computeDependencyLinks({ ...params, dependencies: [] });
    const second = computeDependencyLinks({ ...params, dependencies: [] });
    expect(first).toHaveLength(0);
    expect(first).toBe(second);
  });

  it('still routes the links that do exist', () => {
    const links = computeDependencyLinks({
      ...params,
      dependencies: [{ from: '1', to: '2', type: 'FS' }],
    });
    expect(links).toHaveLength(1);
    expect(links[0]!.id).toBe('1->2');
  });
});
