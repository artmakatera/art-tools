import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Gantt } from '../../Gantt';
import type { GanttTask } from '../../types';

/** A parent task with one child, so the tree column shows an expand button. */
function makeTasks(): GanttTask[] {
  return [
    {
      id: 'p0',
      name: 'Parent',
      startDate: new Date(2026, 0, 1),
      endDate: new Date(2026, 0, 10),
      duration: 9,
      progress: 0,
      type: 'task',
      parentId: null,
    },
    {
      id: 'c0',
      name: 'Child',
      startDate: new Date(2026, 0, 2),
      endDate: new Date(2026, 0, 5),
      duration: 3,
      progress: 0,
      type: 'task',
      parentId: 'p0',
    },
  ];
}

describe('<Gantt /> slots delivery', () => {
  it('delivers taskList slots by prop-drilling to the tree cell expand button', () => {
    const { container } = render(
      <Gantt
        tasks={makeTasks()}
        height={500}
        taskList={{
          treeCell: { slotProps: { expandButton: { className: 'itg-toggle' } } },
        }}
      />,
    );
    const toggle = container.querySelector('.itg-toggle');
    expect(toggle).not.toBeNull();
    expect(toggle!.className).toMatch(/expandBtn/); // internal default class still present
  });

  it('delivers bar slots through context to deep TaskBar (no prop-drilling)', () => {
    const { container } = render(
      <Gantt
        tasks={makeTasks()}
        height={500}
        bars={{ taskBar: { slotProps: { root: { className: 'itg-bar' } } } }}
      />,
    );
    const bar = container.querySelector('.itg-bar');
    expect(bar).not.toBeNull();
  });

  it('delivers timeline slots through context to the grid columns', () => {
    const { container } = render(
      <Gantt
        tasks={makeTasks()}
        height={500}
        timeline={{ gridColumn: { slotProps: { column: { className: 'itg-col' } } } }}
      />,
    );
    expect(container.querySelector('.itg-col')).not.toBeNull();
  });

  it('renders unchanged when no slot configs are passed (regression)', () => {
    const { container } = render(<Gantt tasks={makeTasks()} height={500} />);
    // Default expand button + bar chrome still present.
    expect(container.querySelector('[aria-label="Expand"], [aria-label="Collapse"]')).not.toBeNull();
  });
});
