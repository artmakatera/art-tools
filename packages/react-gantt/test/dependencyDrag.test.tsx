import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Gantt, type GanttTask } from '../src';

const tasks: GanttTask[] = [
  { id: '1', name: 'Design phase', startDate: new Date('2026-01-01'), endDate: new Date('2026-01-15') },
  { id: '2', name: 'Implementation', startDate: new Date('2026-01-16'), endDate: new Date('2026-02-15') },
];

// hideTaskList keeps the grid's connector handles as the only `.handle`
// elements (the task-list resize handle shares the class name).
function renderGrid(onDependencyCreate: (dep: unknown) => void) {
  const { container } = render(
    <Gantt tasks={tasks} hideTaskList onDependencyCreate={onDependencyCreate} />,
  );
  // Two handles per bar, in task order: [t1 start, t1 end, t2 start, t2 end].
  return container.querySelectorAll<HTMLDivElement>('.handle');
}

describe('dependency drag', () => {
  it('creates an FS dependency when dragging end handle → start handle', () => {
    const onDependencyCreate = vi.fn();
    const handles = renderGrid(onDependencyCreate);
    expect(handles).toHaveLength(4);

    fireEvent.mouseDown(handles[1]!); // task 1, end
    fireEvent.mouseUp(handles[2]!); // task 2, start

    expect(onDependencyCreate).toHaveBeenCalledTimes(1);
    expect(onDependencyCreate).toHaveBeenCalledWith({ from: '1', to: '2', type: 'FS' });
  });

  it('does not create a dependency when released on empty space', () => {
    const onDependencyCreate = vi.fn();
    const handles = renderGrid(onDependencyCreate);

    fireEvent.mouseDown(handles[1]!);
    fireEvent.mouseUp(window);

    expect(onDependencyCreate).not.toHaveBeenCalled();
  });

  it('does not create a self-dependency', () => {
    const onDependencyCreate = vi.fn();
    const handles = renderGrid(onDependencyCreate);

    fireEvent.mouseDown(handles[1]!); // task 1, end
    fireEvent.mouseUp(handles[0]!); // task 1, start

    expect(onDependencyCreate).not.toHaveBeenCalled();
  });
});
