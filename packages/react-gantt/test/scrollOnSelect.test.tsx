import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Gantt, type GanttTask } from '../src';

// Local-time constructors, never ISO strings: `new Date('2026-01-01')` parses as
// UTC midnight while the geometry reads local civil instants, so west of Greenwich
// the two disagree by a day and east of it by an hour.
// `endDate` is exclusive (ADR-014), so task 1 covers Jan 1..14.
const tasks: GanttTask[] = [
  { id: '1', name: 'Design phase', startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 15) },
  { id: '2', name: 'Implementation', startDate: new Date(2026, 0, 16), endDate: new Date(2026, 1, 15) },
];

describe('scroll grid to selected task', () => {
  it('scrolls the grid horizontally on the FIRST task-list selection', () => {
    const { container } = render(
      <Gantt tasks={tasks} columns={[]} height={300} colWidth={40} />,
    );
    const grid = container.querySelector<HTMLDivElement>('.gridWrapper')!;
    // jsdom has no layout; emulate a narrow viewport so the far bar is off-screen.
    Object.defineProperty(grid, 'clientWidth', { value: 200, configurable: true });

    const rows = container.querySelectorAll<HTMLDivElement>('.taskList .row');
    expect(grid.scrollLeft).toBe(0);

    // First selection: task 2's bar is far to the right → grid must scroll.
    fireEvent.click(rows[1]!);
    expect(grid.scrollLeft).toBeGreaterThan(0);

    // Selecting the near task scrolls back to reveal it.
    fireEvent.click(rows[0]!);
    expect(grid.scrollLeft).toBe(0);
  });
});
