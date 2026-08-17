import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Gantt } from '../../Gantt';
import type { ColumnApi, GanttHandle, GanttTask, TaskDependency } from '../../types';

const tasks: GanttTask[] = [
  {
    id: '1',
    name: 'Design phase',
    startDate: new Date(2026, 0, 1),
    endDate: new Date(2026, 0, 15),
    progress: 40,
    parentId: null,
  },
  {
    id: '2',
    name: 'Implementation',
    startDate: new Date(2026, 0, 16),
    endDate: new Date(2026, 1, 15),
    progress: 10,
    parentId: null,
  },
];

const dependencies: TaskDependency[] = [{ from: '1', to: '2', type: 'FS' }];

describe('readOnly — timeline affordances', () => {
  // hideTaskList keeps the grid's connector handles as the only `.handle`
  // elements (the task-list splitter shares the class name).
  it('still renders the bars', () => {
    const { container } = render(<Gantt tasks={tasks} height={400} readOnly hideTaskList />);
    expect(container.querySelectorAll('.am-gantt-bar-task')).toHaveLength(2);
  });

  it('renders no resize grips, progress grip or connector handles', () => {
    const { container } = render(<Gantt tasks={tasks} height={400} readOnly hideTaskList />);
    expect(container.querySelector('.resizer')).toBeNull();
    expect(container.querySelector('.barProgressResizeHandle')).toBeNull();
    expect(container.querySelector('.handle')).toBeNull();
  });

  it('renders all three by default (the affordances are only gone when asked)', () => {
    const { container } = render(<Gantt tasks={tasks} height={400} hideTaskList />);
    expect(container.querySelector('.resizer')).not.toBeNull();
    expect(container.querySelector('.barProgressResizeHandle')).not.toBeNull();
    expect(container.querySelector('.handle')).not.toBeNull();
  });

  it('leaves the bar in place when it is dragged', () => {
    const onTasksChange = vi.fn();
    const { container } = render(
      <Gantt
        tasks={tasks}
        height={400}
        readOnly
        hideTaskList
        onTasksChange={onTasksChange}
      />,
    );
    const bar = container.querySelector<HTMLDivElement>('.am-gantt-bar-task')!;
    const left = bar.style.left;

    fireEvent.mouseDown(bar, { clientX: 0 });
    fireEvent.mouseMove(window, { clientX: 200 });
    fireEvent.mouseUp(window);

    expect(bar.style.left).toBe(left);
    expect(onTasksChange).not.toHaveBeenCalled();
  });

  // Control for the test above: the same gesture on an interactive chart moves
  // the bar, so the assertion there is about `readOnly`, not about the gesture.
  it('moves the bar for the same gesture when interactive', () => {
    const { container } = render(<Gantt tasks={tasks} height={400} hideTaskList />);
    const bar = container.querySelector<HTMLDivElement>('.am-gantt-bar-task')!;
    const left = bar.style.left;

    fireEvent.mouseDown(bar, { clientX: 0 });
    fireEvent.mouseMove(window, { clientX: 200 });

    expect(bar.style.left).not.toBe(left);
    fireEvent.mouseUp(window);
  });
});

describe('readOnly — dependency links', () => {
  it('draws the links but gives them no hit areas', () => {
    const { container } = render(
      <Gantt
        tasks={tasks}
        height={400}
        readOnly
        hideTaskList
        dependencies={dependencies}
      />,
    );
    expect(container.querySelector('.segment')).not.toBeNull();
    expect(container.querySelector('.hitArea')).toBeNull();
  });

  it('cannot select a link, so no delete button appears', () => {
    const onDependencyDelete = vi.fn();
    const { container } = render(
      <Gantt
        tasks={tasks}
        height={400}
        readOnly
        hideTaskList
        dependencies={dependencies}
        onDependencyDelete={onDependencyDelete}
      />,
    );
    fireEvent.click(container.querySelector('.segment')!);
    expect(container.querySelector('.deleteBtn')).toBeNull();

    // The Delete shortcut only fires for a selected link, which is unreachable.
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(onDependencyDelete).not.toHaveBeenCalled();
  });
});

describe('readOnly — task list', () => {
  it('drops the built-in actions column', () => {
    render(<Gantt tasks={tasks} height={400} readOnly />);
    expect(screen.queryByLabelText('Edit Design phase')).toBeNull();
    expect(screen.queryByLabelText('Delete Design phase')).toBeNull();
    // The data columns are untouched.
    expect(screen.getAllByText('Design phase').length).toBeGreaterThan(0);
  });

  it('keeps the actions column when interactive', () => {
    render(<Gantt tasks={tasks} height={400} />);
    expect(screen.getByLabelText('Edit Design phase')).toBeTruthy();
  });

  it('passes readOnly to ColumnDef.render so custom columns can gate themselves', () => {
    const seen: boolean[] = [];
    const columns = [
      {
        key: 'name',
        header: 'Task',
        render: (task: GanttTask, api: ColumnApi) => {
          seen.push(api.readOnly);
          return task.name;
        },
      },
    ];
    render(<Gantt tasks={tasks} height={400} readOnly columns={columns} />);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every(Boolean)).toBe(true);
  });

  it('still selects a row on click', () => {
    const onTaskClick = vi.fn();
    render(<Gantt tasks={tasks} height={400} readOnly onTaskClick={onTaskClick} />);
    fireEvent.click(screen.getAllByText('Design phase')[0]!);
    expect(onTaskClick).toHaveBeenCalledTimes(1);
  });
});

describe('readOnly — imperative API (ADR-021)', () => {
  it('still mutates through apiRef', () => {
    const apiRef = createRef<GanttHandle>();
    const { container } = render(
      <Gantt tasks={tasks} height={400} readOnly apiRef={apiRef} />,
    );
    expect(container.querySelectorAll('.taskList .row')).toHaveLength(2);

    act(() => apiRef.current!.deleteTask('2'));
    expect(container.querySelectorAll('.taskList .row')).toHaveLength(1);
  });
});
