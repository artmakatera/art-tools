import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Gantt, type Task } from '../src';

const tasks: readonly Task[] = [
  {
    id: '1',
    name: 'Design phase',
    start: new Date('2026-01-01'),
    end: new Date('2026-01-15'),
  },
  {
    id: '2',
    name: 'Implementation',
    start: new Date('2026-01-16'),
    end: new Date('2026-02-15'),
  },
];

describe('<Gantt />', () => {
  it('renders one row per task', () => {
    render(<Gantt tasks={tasks} />);
    expect(screen.getByText('Design phase')).toBeInTheDocument();
    expect(screen.getByText('Implementation')).toBeInTheDocument();
  });

  it('invokes onTaskClick with the clicked task', () => {
    const onTaskClick = vi.fn();
    render(<Gantt tasks={tasks} onTaskClick={onTaskClick} />);
    fireEvent.click(screen.getByText('Design phase'));
    expect(onTaskClick).toHaveBeenCalledTimes(1);
    expect(onTaskClick).toHaveBeenCalledWith(tasks[0]);
  });

  it('respects a custom rowHeight', () => {
    const { container } = render(<Gantt tasks={tasks} rowHeight={48} />);
    const firstRow = container.querySelector<HTMLButtonElement>('.react-gantt__row');
    expect(firstRow?.style.height).toBe('48px');
  });

  it('renders nothing when given an empty task list', () => {
    const { container } = render(<Gantt tasks={[]} />);
    expect(container.querySelectorAll('.react-gantt__row')).toHaveLength(0);
  });
});
