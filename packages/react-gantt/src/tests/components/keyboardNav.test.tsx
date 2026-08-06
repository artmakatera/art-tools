import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Gantt } from '../../Gantt';
import type { GanttTask } from '../../types';

const tasks: GanttTask[] = [
  {
    id: 'p1',
    name: 'Design phase',
    type: 'summary',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-01-20'),
  },
  {
    id: 'c1',
    name: 'Wireframes',
    parentId: 'p1',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-01-10'),
  },
  {
    id: 'c2',
    name: 'Mockups',
    parentId: 'p1',
    startDate: new Date('2026-01-11'),
    endDate: new Date('2026-01-20'),
  },
  {
    id: 'p2',
    name: 'Implementation',
    startDate: new Date('2026-01-21'),
    endDate: new Date('2026-02-15'),
  },
];

/** data-task-id of whatever currently holds DOM focus. */
function focusedId(): string | undefined {
  return (document.activeElement as HTMLElement | null)?.dataset.taskId;
}

function setup(props: Partial<React.ComponentProps<typeof Gantt>> = {}) {
  const utils = render(<Gantt tasks={tasks} height={400} {...props} />);
  const listRows = () => [
    ...utils.container.querySelectorAll<HTMLElement>('.taskList .rows .row'),
  ];
  /** Focus the pane's roving stop the way Tab would, then return it. */
  const enterList = () => {
    const stop = utils.container.querySelector<HTMLElement>(
      '.taskList .rows .row[tabindex="0"]',
    )!;
    // Must flush: focusing commits the cursor through React state, and a
    // keydown fired before that render lands would act on the previous cursor.
    act(() => {
      stop.focus();
    });
    return stop;
  };
  return { ...utils, listRows, enterList };
}

describe('task-list keyboard navigation', () => {
  it('exposes exactly one tab stop, on the first row', () => {
    const { listRows } = setup();
    const stops = listRows().filter((r) => r.tabIndex === 0);
    expect(stops).toHaveLength(1);
    expect(stops[0]).toHaveAttribute('data-task-id', 'p1');
  });

  it('moves the cursor down and up', () => {
    const { enterList } = setup();
    const stop = enterList();
    expect(focusedId()).toBe('p1');

    fireEvent.keyDown(stop, { key: 'ArrowDown' });
    expect(focusedId()).toBe('c1');

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(focusedId()).toBe('c2');

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    expect(focusedId()).toBe('c1');
  });

  it('clamps at both ends instead of wrapping', () => {
    const { enterList } = setup();
    const stop = enterList();
    fireEvent.keyDown(stop, { key: 'ArrowUp' });
    expect(focusedId()).toBe('p1');

    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(focusedId()).toBe('p2');
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(focusedId()).toBe('p2');
  });

  it('jumps to the first and last row with Home and End', () => {
    const { enterList } = setup();
    const stop = enterList();
    fireEvent.keyDown(stop, { key: 'End' });
    expect(focusedId()).toBe('p2');
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(focusedId()).toBe('p1');
  });

  it('moves the roving tabindex with the cursor', () => {
    const { enterList, listRows } = setup();
    fireEvent.keyDown(enterList(), { key: 'ArrowDown' });
    const stops = listRows().filter((r) => r.tabIndex === 0);
    expect(stops).toHaveLength(1);
    expect(stops[0]).toHaveAttribute('data-task-id', 'c1');
  });

  describe('Left/Right follow the treegrid pattern', () => {
    it('collapses an expanded branch with ArrowLeft', () => {
      const { enterList, listRows } = setup();
      fireEvent.keyDown(enterList(), { key: 'ArrowLeft' });
      expect(listRows()).toHaveLength(2);
      expect(listRows()[0]).toHaveAttribute('aria-expanded', 'false');
    });

    it('expands a collapsed branch with ArrowRight, staying put', () => {
      const { enterList, listRows } = setup();
      const stop = enterList();
      fireEvent.keyDown(stop, { key: 'ArrowLeft' });
      fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
      expect(listRows()).toHaveLength(4);
      expect(focusedId()).toBe('p1');
    });

    it('steps onto the first child when the branch is already open', () => {
      const { enterList } = setup();
      fireEvent.keyDown(enterList(), { key: 'ArrowRight' });
      expect(focusedId()).toBe('c1');
    });

    it('walks to the parent from a child', () => {
      const { enterList } = setup();
      fireEvent.keyDown(enterList(), { key: 'ArrowDown' });
      expect(focusedId()).toBe('c1');
      fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
      expect(focusedId()).toBe('p1');
    });

    it('does nothing on a root-level leaf', () => {
      const { enterList } = setup();
      fireEvent.keyDown(enterList(), { key: 'End' });
      expect(focusedId()).toBe('p2');
      fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
      expect(focusedId()).toBe('p2');
      fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
      expect(focusedId()).toBe('p2');
    });
  });

  describe('activation', () => {
    it('fires onTaskClick once on Enter', () => {
      const onTaskClick = vi.fn();
      const { enterList } = setup({ onTaskClick });
      fireEvent.keyDown(enterList(), { key: 'Enter' });
      expect(onTaskClick).toHaveBeenCalledTimes(1);
      expect(onTaskClick.mock.calls[0]![0]).toMatchObject({ id: 'p1' });
    });

    it('does not fire onTaskClick merely for moving the cursor', () => {
      const onTaskClick = vi.fn();
      const { enterList } = setup({ onTaskClick });
      const stop = enterList();
      fireEvent.keyDown(stop, { key: 'ArrowDown' });
      fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
      expect(onTaskClick).not.toHaveBeenCalled();
    });

    it('still selects the row the cursor lands on', () => {
      const { enterList, listRows } = setup();
      fireEvent.keyDown(enterList(), { key: 'ArrowDown' });
      expect(listRows()[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('toggles a branch with Space, and activates a leaf', () => {
      const onTaskClick = vi.fn();
      const { enterList, listRows } = setup({ onTaskClick });
      const stop = enterList();
      fireEvent.keyDown(stop, { key: ' ' });
      expect(listRows()).toHaveLength(2);
      expect(onTaskClick).not.toHaveBeenCalled();

      fireEvent.keyDown(document.activeElement!, { key: 'End' });
      fireEvent.keyDown(document.activeElement!, { key: ' ' });
      expect(onTaskClick).toHaveBeenCalledTimes(1);
    });

    it('toggles exactly once on Enter over the expand button', () => {
      // The button is tabIndex -1 and Enter is preventDefault'd, so the row
      // handler must not race the button's synthetic click.
      const { enterList, listRows } = setup();
      const stop = enterList();
      fireEvent.keyDown(stop, { key: ' ' });
      expect(listRows()).toHaveLength(2);
    });
  });

  describe('event handling', () => {
    it('prevents the default scroll for every key it consumes', () => {
      const { enterList } = setup();
      const stop = enterList();
      for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp', ' ']) {
        const prevented = !fireEvent.keyDown(document.activeElement ?? stop, { key });
        expect(prevented, `expected ${key} to be consumed`).toBe(true);
      }
    });

    it('ignores keys aimed at a text input inside a cell', () => {
      const onTaskClick = vi.fn();
      const { container } = setup({
        onTaskClick,
        columns: [
          {
            key: 'edit',
            header: 'Edit',
            isTreeColumn: true,
            render: (task) => <input defaultValue={task.name} />,
          },
        ],
      });
      const input = container.querySelector('input')!;
      input.focus();
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      // Cursor must not have moved off the first row.
      expect(focusedId()).toBeUndefined();
      expect(document.activeElement).toBe(input);
    });

    it('leaves an unhandled key alone', () => {
      const { enterList } = setup();
      const notPrevented = fireEvent.keyDown(enterList(), { key: 'x' });
      expect(notPrevented).toBe(true);
    });
  });
});

describe('timeline keyboard navigation', () => {
  function setupGrid(props: Partial<React.ComponentProps<typeof Gantt>> = {}) {
    const utils = render(<Gantt tasks={tasks} height={400} hideTaskList {...props} />);
    const enterGrid = () => {
      const stop = utils.container.querySelector<HTMLElement>(
        '[data-gantt-slot="bar"][tabindex="0"]',
      )!;
      act(() => {
        stop.focus();
      });
      return stop;
    };
    return { ...utils, enterGrid };
  }

  it('exposes one tab stop on the first bar', () => {
    const { container } = setupGrid();
    const stops = container.querySelectorAll('[data-gantt-slot="bar"][tabindex="0"]');
    expect(stops).toHaveLength(1);
    expect(stops[0]).toHaveAttribute('data-task-id', 'p1');
  });

  it('moves the cursor between bars', () => {
    const { enterGrid } = setupGrid();
    fireEvent.keyDown(enterGrid(), { key: 'ArrowDown' });
    expect((document.activeElement as HTMLElement).dataset.taskId).toBe('c1');
    expect((document.activeElement as HTMLElement).dataset.ganttSlot).toBe('bar');
  });

  it('zooms with +/- only when zoomKeyboard is on', () => {
    const onZoomChange = vi.fn();
    const { enterGrid } = setupGrid({ zoomKeyboard: true, onZoomChange });
    onZoomChange.mockClear();
    fireEvent.keyDown(enterGrid(), { key: '+' });
    expect(onZoomChange).toHaveBeenCalled();
  });

  it('ignores +/- when zoomKeyboard is off', () => {
    const onZoomChange = vi.fn();
    const { enterGrid } = setupGrid({ onZoomChange });
    onZoomChange.mockClear();
    fireEvent.keyDown(enterGrid(), { key: '+' });
    expect(onZoomChange).not.toHaveBeenCalled();
  });

  it('expands and collapses from the timeline too', () => {
    const { container, enterGrid } = setupGrid();
    fireEvent.keyDown(enterGrid(), { key: 'ArrowLeft' });
    expect(container.querySelectorAll('[data-gantt-slot="bar-row"]')).toHaveLength(2);
  });
});
