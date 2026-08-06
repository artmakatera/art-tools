import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Gantt } from '../../Gantt';
import type { GanttTask, TaskDependency } from '../../types';

const tasks: GanttTask[] = [
  { id: 'a', name: 'Alpha', startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 10) },
  { id: 'b', name: 'Beta', startDate: new Date(2026, 0, 12), endDate: new Date(2026, 0, 20) },
  { id: 'm', name: 'Launch', type: 'milestone', startDate: new Date(2026, 0, 25) },
];

function setup(props: Partial<React.ComponentProps<typeof Gantt>> = {}) {
  const onTasksChange = vi.fn();
  const utils = render(
    <Gantt
      tasks={tasks}
      height={400}
      hideTaskList
      keyboardEditing
      onTasksChange={onTasksChange}
      {...props}
    />,
  );
  const focusBar = (id: string) => {
    const bar = utils.container.querySelector<HTMLElement>(
      `[data-gantt-slot="bar"][data-task-id="${id}"]`,
    )!;
    // Must flush: focusing commits the cursor through React state, and a
    // keydown fired before that render lands would act on the previous cursor.
    act(() => {
      bar.focus();
    });
    return bar;
  };
  /** Latest task list the consumer was handed. */
  const latest = (): GanttTask[] =>
    onTasksChange.mock.calls.at(-1)?.[0] ?? tasks;
  const taskById = (id: string) => latest().find((t) => t.id === id)!;
  const liveRegion = () => utils.container.querySelector('[role="status"]')!.textContent?.trim();

  return { ...utils, onTasksChange, focusBar, latest, taskById, liveRegion };
}

describe('keyboard move and resize', () => {
  it('moves a bar one column per press, preserving its span', () => {
    const { focusBar, taskById } = setup();
    fireEvent.keyDown(focusBar('a'), { key: 'ArrowRight' });
    expect(taskById('a').startDate).toEqual(new Date(2026, 0, 2));
    expect(taskById('a').endDate).toEqual(new Date(2026, 0, 11));
  });

  it('moves left as well', () => {
    const { focusBar, taskById } = setup();
    fireEvent.keyDown(focusBar('a'), { key: 'ArrowLeft' });
    expect(taskById('a').startDate).toEqual(new Date(2025, 11, 31));
  });

  it('returns to the original dates after right then left', () => {
    const { focusBar, taskById } = setup();
    const bar = focusBar('a');
    fireEvent.keyDown(bar, { key: 'ArrowRight' });
    fireEvent.keyDown(document.activeElement ?? bar, { key: 'ArrowLeft' });
    expect(taskById('a').startDate).toEqual(new Date(2026, 0, 1));
    expect(taskById('a').endDate).toEqual(new Date(2026, 0, 10));
  });

  it('resizes the end edge with Shift', () => {
    const { focusBar, taskById } = setup();
    fireEvent.keyDown(focusBar('a'), { key: 'ArrowRight', shiftKey: true });
    expect(taskById('a').startDate).toEqual(new Date(2026, 0, 1));
    expect(taskById('a').endDate).toEqual(new Date(2026, 0, 11));
  });

  it('resizes the start edge with Alt', () => {
    const { focusBar, taskById } = setup();
    fireEvent.keyDown(focusBar('a'), { key: 'ArrowRight', altKey: true });
    expect(taskById('a').startDate).toEqual(new Date(2026, 0, 2));
    expect(taskById('a').endDate).toEqual(new Date(2026, 0, 10));
  });

  it('consumes Alt+Arrow so the browser does not navigate back', () => {
    const { focusBar } = setup();
    const notPrevented = fireEvent.keyDown(focusBar('a'), {
      key: 'ArrowLeft',
      altKey: true,
    });
    expect(notPrevented).toBe(false);
  });

  it('leaves Ctrl/Meta+Arrow to the browser', () => {
    const { focusBar, onTasksChange } = setup();
    fireEvent.keyDown(focusBar('a'), { key: 'ArrowRight', ctrlKey: true });
    expect(onTasksChange).not.toHaveBeenCalled();
  });

  it('records one undo step per keypress', () => {
    const { focusBar, onTasksChange } = setup();
    const bar = focusBar('a');
    fireEvent.keyDown(bar, { key: 'ArrowRight' });
    fireEvent.keyDown(document.activeElement ?? bar, { key: 'ArrowRight' });
    fireEvent.keyDown(document.activeElement ?? bar, { key: 'ArrowRight' });
    expect(onTasksChange).toHaveBeenCalledTimes(3);
  });

  it('never gives a milestone an end date', () => {
    const { focusBar, taskById } = setup();
    fireEvent.keyDown(focusBar('m'), { key: 'ArrowRight' });
    expect(taskById('m').startDate).toEqual(new Date(2026, 0, 26));
    expect(taskById('m').endDate).toBeUndefined();
  });

  it('refuses to resize a milestone and says why', () => {
    const { focusBar, onTasksChange, liveRegion } = setup();
    fireEvent.keyDown(focusBar('m'), { key: 'ArrowRight', shiftKey: true });
    expect(onTasksChange).not.toHaveBeenCalled();
    // The live region is debounced; assert the message eventually lands.
    return vi.waitFor(() => {
      expect(liveRegion()).toMatch(/milestone and cannot be resized/);
    });
  });

  it('announces the new dates after a move', () => {
    const { focusBar, liveRegion } = setup();
    fireEvent.keyDown(focusBar('a'), { key: 'ArrowRight' });
    return vi.waitFor(() => {
      expect(liveRegion()).toMatch(/^Alpha, /);
    });
  });

  it('cascades dependents into the same undo step', () => {
    const dependencies: TaskDependency[] = [{ from: 'a', to: 'b', type: 'FS' }];
    const { focusBar, onTasksChange } = setup({ dependencies });
    // Push Alpha well past Beta's start so the FS link must reschedule Beta.
    const bar = focusBar('a');
    for (let i = 0; i < 5; i += 1) {
      fireEvent.keyDown(document.activeElement ?? bar, { key: 'ArrowRight' });
    }
    const final = onTasksChange.mock.calls.at(-1)![0] as GanttTask[];
    const alpha = final.find((t) => t.id === 'a')!;
    const beta = final.find((t) => t.id === 'b')!;
    expect(beta.startDate.getTime()).toBeGreaterThan(alpha.endDate!.getTime());
    // One call per press, cascade included — not one per rescheduled task.
    expect(onTasksChange).toHaveBeenCalledTimes(5);
  });
});

describe('keyboardEditing gate', () => {
  it('does not modify tasks when the flag is off', () => {
    const { focusBar, onTasksChange } = setup({ keyboardEditing: false });
    fireEvent.keyDown(focusBar('a'), { key: 'ArrowRight' });
    expect(onTasksChange).not.toHaveBeenCalled();
  });

  it('leaves Left/Right as expand-collapse when the flag is off', () => {
    const nested: GanttTask[] = [
      { id: 'p', name: 'Parent', type: 'summary', startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 20) },
      { id: 'c', name: 'Child', parentId: 'p', startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 10) },
    ];
    const { container, focusBar } = setup({ keyboardEditing: false, tasks: nested });
    fireEvent.keyDown(focusBar('p'), { key: 'ArrowLeft' });
    expect(container.querySelectorAll('[data-gantt-slot="bar-row"]')).toHaveLength(1);
  });

  it('nudging wins over expand-collapse when the flag is on', () => {
    const nested: GanttTask[] = [
      { id: 'p', name: 'Parent', type: 'summary', startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 20) },
      { id: 'c', name: 'Child', parentId: 'p', startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 10) },
    ];
    const { container, focusBar } = setup({ tasks: nested });
    fireEvent.keyDown(focusBar('c'), { key: 'ArrowLeft' });
    // Still both rows: the key nudged the child rather than collapsing.
    expect(container.querySelectorAll('[data-gantt-slot="bar-row"]')).toHaveLength(2);
  });

  it('refuses to nudge a summary whose dates come from its children', () => {
    const nested: GanttTask[] = [
      { id: 'p', name: 'Parent', type: 'summary', startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 20) },
      { id: 'c', name: 'Child', parentId: 'p', startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 10) },
    ];
    const { focusBar, onTasksChange, liveRegion } = setup({ tasks: nested });
    fireEvent.keyDown(focusBar('p'), { key: 'ArrowRight' });
    expect(onTasksChange).not.toHaveBeenCalled();
    return vi.waitFor(() => {
      expect(liveRegion()).toMatch(/summary; its dates follow its children/);
    });
  });
});
