import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Gantt } from '../../../Gantt';
import { UNMEASURED_FALLBACK_COUNT } from '../../../core/constants';
import type { GanttTask } from '../../../types';

/** Flat list of `count` sequential 3-day tasks starting 2026-01-01. */
function makeTasks(count: number): GanttTask[] {
  const tasks: GanttTask[] = [];
  for (let i = 0; i < count; i++) {
    const startDate = new Date(2026, 0, 1 + i);
    const endDate = new Date(2026, 0, 3 + i);
    tasks.push({
      id: `t${i}`,
      name: `Task ${i}`,
      startDate,
      endDate,
      duration: 3,
      progress: 0,
      type: 'task',
      parentId: null,
    });
  }
  return tasks;
}

describe('<Gantt /> initial mount', () => {
  it('renders a bounded window while the viewport is unmeasured', () => {
    // jsdom never measures (clientWidth/clientHeight stay 0), so this exercises
    // the exact state of the first browser commit — before useLayoutEffect
    // reports real metrics. Without the fallback cap this would commit every
    // row twice (task list + grid), which is what made mounting 10k tasks take
    // ~20s in the browser.
    const taskCount = UNMEASURED_FALLBACK_COUNT * 5;
    const { container } = render(<Gantt tasks={makeTasks(taskCount)} height={500} />);

    // `.row` matches TaskListRow, Bar, and CalendarRow; discount the calendar
    // scale rows, then both remaining sides (task list + bars) must be capped.
    const rows = container.querySelectorAll('.row').length;
    const calendarRows = container.querySelectorAll('.calendar .row').length;
    const taskRows = rows - calendarRows;
    expect(taskRows).toBeGreaterThan(0);
    expect(taskRows).toBeLessThanOrEqual(UNMEASURED_FALLBACK_COUNT * 2);
  });
});
