import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Gantt } from '../../Gantt';
import type { GanttTask, TaskDependency } from '../../types';

const tasks: GanttTask[] = [
  { id: 'a', name: 'Alpha', startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 10) },
  { id: 'b', name: 'Beta', startDate: new Date(2026, 0, 12), endDate: new Date(2026, 0, 20) },
  { id: 'c', name: 'Gamma', startDate: new Date(2026, 0, 22), endDate: new Date(2026, 0, 30) },
];

function setup(props: Partial<React.ComponentProps<typeof Gantt>> = {}) {
  const onDependencyCreate = vi.fn();
  const utils = render(
    <Gantt
      tasks={tasks}
      height={400}
      hideTaskList
      keyboardEditing
      onDependencyCreate={onDependencyCreate}
      {...props}
    />,
  );
  const focusBar = (id: string) => {
    const bar = utils.container.querySelector<HTMLElement>(
      `[data-gantt-slot="bar"][data-task-id="${id}"]`,
    )!;
    act(() => {
      bar.focus();
    });
    return bar;
  };
  const press = (key: string, init: Partial<KeyboardEventInit> = {}) =>
    fireEvent.keyDown(document.activeElement ?? document.body, { key, ...init });
  const liveRegion = () =>
    utils.container.querySelector('[role="status"]')!.textContent?.trim();
  const targetHandle = () =>
    utils.container.querySelector<HTMLElement>('.handle.target');

  return { ...utils, onDependencyCreate, focusBar, press, liveRegion, targetHandle };
}

describe('keyboard dependency links', () => {
  it('creates a finish-to-start link with Enter, arrows, Enter', () => {
    const { focusBar, press, onDependencyCreate } = setup();
    focusBar('a');
    press('Enter'); // link from Alpha's end handle; target seeds to Beta
    press('Enter'); // confirm on Beta's start handle
    expect(onDependencyCreate).toHaveBeenCalledTimes(1);
    expect(onDependencyCreate).toHaveBeenCalledWith({ from: 'a', to: 'b', type: 'FS' });
  });

  it('creates finish-to-finish by choosing the target end edge', () => {
    const { focusBar, press, onDependencyCreate } = setup();
    focusBar('a');
    press('Enter');
    press('ArrowRight'); // target edge → end
    press('Enter');
    expect(onDependencyCreate).toHaveBeenCalledWith({ from: 'a', to: 'b', type: 'FF' });
  });

  it('creates start-to-start from Shift+Enter', () => {
    const { focusBar, press, onDependencyCreate } = setup();
    focusBar('a');
    press('Enter', { shiftKey: true }); // source edge → start
    press('Enter');
    expect(onDependencyCreate).toHaveBeenCalledWith({ from: 'a', to: 'b', type: 'SS' });
  });

  it('creates start-to-finish from Shift+Enter plus the target end edge', () => {
    const { focusBar, press, onDependencyCreate } = setup();
    focusBar('a');
    press('Enter', { shiftKey: true });
    press('ArrowRight');
    press('Enter');
    expect(onDependencyCreate).toHaveBeenCalledWith({ from: 'a', to: 'b', type: 'SF' });
  });

  it('walks the target with the arrow keys', () => {
    const { focusBar, press, onDependencyCreate } = setup();
    focusBar('a');
    press('Enter');
    press('ArrowDown'); // Beta → Gamma
    press('Enter');
    expect(onDependencyCreate).toHaveBeenCalledWith({ from: 'a', to: 'c', type: 'FS' });
  });

  it('skips the source task when walking targets', () => {
    const { focusBar, press, onDependencyCreate } = setup();
    focusBar('b'); // middle task; seed target is Gamma
    press('Enter');
    press('ArrowUp'); // would land on Beta itself → skips to Alpha
    press('Enter');
    expect(onDependencyCreate).toHaveBeenCalledWith({ from: 'b', to: 'a', type: 'FS' });
  });

  it('creates nothing on Escape', () => {
    const { focusBar, press, onDependencyCreate } = setup();
    focusBar('a');
    press('Enter');
    press('Escape');
    expect(onDependencyCreate).not.toHaveBeenCalled();
  });

  it('returns focus to the source bar after cancelling', () => {
    const { focusBar, press } = setup();
    focusBar('a');
    press('Enter');
    press('Escape');
    const active = document.activeElement as HTMLElement;
    expect(active.dataset.ganttSlot).toBe('bar');
    expect(active.dataset.taskId).toBe('a');
  });

  it('moves focus onto the source connector handle while linking', () => {
    const { focusBar, press } = setup();
    focusBar('a');
    press('Enter');
    const active = document.activeElement as HTMLElement;
    expect(active.dataset.ganttSlot).toBe('endHandle');
    expect(active.dataset.taskId).toBe('a');
    expect(active.tabIndex).toBe(0);
  });

  it('highlights the prospective target handle', () => {
    const { focusBar, press, targetHandle } = setup();
    focusBar('a');
    press('Enter');
    expect(targetHandle()).not.toBeNull();
    expect(targetHandle()!.dataset.taskId).toBe('b');
    expect(targetHandle()!.dataset.ganttSlot).toBe('startHandle');
  });

  it('survives a stray window mouseup mid-flow', () => {
    // The pointer flow's startDrag installs a window mouseup that cancels the
    // drag; the keyboard flow must not, or any click would kill the link.
    const { focusBar, press, onDependencyCreate } = setup();
    focusBar('a');
    press('Enter');
    fireEvent.mouseUp(window);
    press('Enter');
    expect(onDependencyCreate).toHaveBeenCalledWith({ from: 'a', to: 'b', type: 'FS' });
  });

  it('does not consume Enter when the consumer wired no onDependencyCreate', () => {
    const onTaskClick = vi.fn();
    const { focusBar, press } = setup({
      onDependencyCreate: undefined,
      onTaskClick,
    });
    focusBar('a');
    press('Enter');
    // Falls through to activation instead of entering a dead link mode.
    expect(onTaskClick).toHaveBeenCalledTimes(1);
  });

  it('does nothing when keyboardEditing is off', () => {
    const { focusBar, press, onDependencyCreate } = setup({ keyboardEditing: false });
    focusBar('a');
    press('Enter');
    press('Enter');
    expect(onDependencyCreate).not.toHaveBeenCalled();
  });
});

describe('link validation', () => {
  it('refuses a duplicate and stays in link mode', () => {
    const dependencies: TaskDependency[] = [{ from: 'a', to: 'b', type: 'FS' }];
    const { focusBar, press, onDependencyCreate, liveRegion } = setup({ dependencies });
    focusBar('a');
    press('Enter');
    press('Enter'); // target is Beta, which is already linked
    expect(onDependencyCreate).not.toHaveBeenCalled();

    // Still linking, so the user can pick a different target without restarting.
    press('ArrowDown');
    press('Enter');
    expect(onDependencyCreate).toHaveBeenCalledWith({ from: 'a', to: 'c', type: 'FS' });
    return vi.waitFor(() => {
      expect(liveRegion()).toMatch(/Linked to Gamma/);
    });
  });

  it('refuses a link that would close a cycle', () => {
    // b → a already exists, so a → b would make a loop.
    const dependencies: TaskDependency[] = [{ from: 'b', to: 'a', type: 'FS' }];
    const { focusBar, press, onDependencyCreate, liveRegion } = setup({ dependencies });
    focusBar('a');
    press('Enter');
    press('Enter');
    expect(onDependencyCreate).not.toHaveBeenCalled();
    return vi.waitFor(() => {
      expect(liveRegion()).toMatch(/circular dependency/);
    });
  });

  it('refuses a cycle through an intermediate task', () => {
    // b → c → a exists, so a → b would close the loop transitively.
    const dependencies: TaskDependency[] = [
      { from: 'b', to: 'c', type: 'FS' },
      { from: 'c', to: 'a', type: 'FS' },
    ];
    const { focusBar, press, onDependencyCreate } = setup({ dependencies });
    focusBar('a');
    press('Enter');
    press('Enter');
    expect(onDependencyCreate).not.toHaveBeenCalled();
  });

  it('still allows an unrelated link when others exist', () => {
    const dependencies: TaskDependency[] = [{ from: 'a', to: 'b', type: 'FS' }];
    const { focusBar, press, onDependencyCreate } = setup({ dependencies });
    focusBar('b');
    press('Enter'); // seeds to Gamma
    press('Enter');
    expect(onDependencyCreate).toHaveBeenCalledWith({ from: 'b', to: 'c', type: 'FS' });
  });
});
