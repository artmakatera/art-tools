import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Gantt } from '../../../Gantt';
import type { GanttTask } from '../../../types';

/** A single root task; `overrides` sets (or omits) the `type`. */
function oneTask(overrides: Partial<GanttTask>): GanttTask[] {
  return [
    {
      id: 't1',
      name: 'T',
      startDate: new Date(2026, 0, 1),
      endDate: new Date(2026, 0, 5),
      duration: 4,
      progress: 0,
      parentId: null,
      ...overrides,
    },
  ];
}

// TaskBar's root carries the global `am-gantt-bar-task` hook class; ProjectBar
// uses `.project`; MilestoneBar renders `.milestoneShape`.
function bars(container: HTMLElement) {
  return {
    task: container.querySelector('.am-gantt-bar-task'),
    summary: container.querySelector('.project'),
    milestone: container.querySelector('.milestoneShape'),
  };
}

describe('Bar type dispatch', () => {
  it('renders a task bar for an untyped task (undefined behaves as "task")', () => {
    const { container } = render(<Gantt tasks={oneTask({})} height={300} hideTaskList />);
    const b = bars(container);
    expect(b.task).not.toBeNull();
    expect(b.summary).toBeNull();
    expect(b.milestone).toBeNull();
  });

  it('renders a task bar for type "task"', () => {
    const { container } = render(
      <Gantt tasks={oneTask({ type: 'task' })} height={300} hideTaskList />,
    );
    const b = bars(container);
    expect(b.task).not.toBeNull();
    expect(b.summary).toBeNull();
    expect(b.milestone).toBeNull();
  });

  it('renders a milestone shape for type "milestone"', () => {
    const { container } = render(
      <Gantt tasks={oneTask({ type: 'milestone' })} height={300} hideTaskList />,
    );
    const b = bars(container);
    expect(b.milestone).not.toBeNull();
    expect(b.task).toBeNull();
    expect(b.summary).toBeNull();
  });

  it('renders a summary (project) bar for type "summary"', () => {
    const { container } = render(
      <Gantt tasks={oneTask({ type: 'summary' })} height={300} hideTaskList />,
    );
    const b = bars(container);
    expect(b.summary).not.toBeNull();
    expect(b.task).toBeNull();
    expect(b.milestone).toBeNull();
  });
});
