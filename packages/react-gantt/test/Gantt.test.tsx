import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Gantt, type GanttTask } from '../src';

const tasks: GanttTask[] = [
  {
    id: '1',
    name: 'Design phase',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-01-15'),
  },
  {
    id: '2',
    name: 'Implementation',
    startDate: new Date('2026-01-16'),
    endDate: new Date('2026-02-15'),
  },
];

describe('<Gantt />', () => {
  // The task name renders in both the task list row and the grid bar, so the
  // queries below pick the task-list occurrence (first in DOM order).
  it('renders one row per task', () => {
    const { container } = render(<Gantt tasks={tasks} />);
    expect(container.querySelectorAll('.taskList .row')).toHaveLength(2);
    expect(screen.getAllByText('Design phase')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Implementation')[0]).toBeInTheDocument();
  });

  it('invokes onTaskClick with the clicked task', () => {
    const onTaskClick = vi.fn();
    render(<Gantt tasks={tasks} onTaskClick={onTaskClick} />);
    fireEvent.click(screen.getAllByText('Design phase')[0]!);
    expect(onTaskClick).toHaveBeenCalledTimes(1);
    expect(onTaskClick).toHaveBeenCalledWith(tasks[0]);
  });

  it('respects a custom rowHeight', () => {
    const { container } = render(<Gantt tasks={tasks} rowHeight={48} />);
    const firstRow = container.querySelector<HTMLDivElement>('.body .row');
    expect(firstRow?.style.height).toBe('48px');
  });

  it('renders nothing when given an empty task list', () => {
    const { container } = render(<Gantt tasks={[]} />);
    expect(container.querySelectorAll('.body .row')).toHaveLength(0);
  });
});
