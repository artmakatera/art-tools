import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTaskList } from '../src/hooks/useTaskList';
import type { GanttTask } from '../src';

const seed: GanttTask[] = [
  { id: '1', name: 'Design phase', startDate: new Date('2026-01-01'), endDate: new Date('2026-01-15') },
  { id: '2', name: 'Implementation', startDate: new Date('2026-01-16'), endDate: new Date('2026-02-15') },
];

describe('useTaskList', () => {
  it('supports create/update/delete with undo/redo round-trips', () => {
    const { result } = renderHook(() => useTaskList(seed));

    expect(result.current.tasksList.map((t) => t.id)).toEqual(['1', '2']);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    const created: GanttTask = {
      id: '3',
      name: 'QA',
      startDate: new Date('2026-02-16'),
      endDate: new Date('2026-02-28'),
    };
    act(() => result.current.createTask(created, '2'));
    expect(result.current.tasksList.map((t) => t.id)).toEqual(['1', '2', '3']);

    act(() => result.current.updateTask('3', { name: 'QA & release' }));
    expect(result.current.tasksList.find((t) => t.id === '3')?.name).toBe('QA & release');

    act(() => result.current.undo());
    expect(result.current.tasksList.find((t) => t.id === '3')?.name).toBe('QA');
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(result.current.tasksList.find((t) => t.id === '3')?.name).toBe('QA & release');

    act(() => result.current.deleteTask('3'));
    expect(result.current.tasksList.map((t) => t.id)).toEqual(['1', '2']);

    act(() => result.current.undo());
    expect(result.current.tasksList.map((t) => t.id)).toEqual(['1', '2', '3']);
  });

  it('skips the undo step when an update changes nothing', () => {
    const { result } = renderHook(() => useTaskList(seed));

    act(() => result.current.updateTask('1', { name: 'Design phase' }));
    expect(result.current.canUndo).toBe(false);
  });

  it('notifies onTasksChange once per edit, not on callback identity changes', () => {
    const first = vi.fn();
    const { result, rerender } = renderHook(
      ({ onTasksChange }) => useTaskList(seed, undefined, { onTasksChange }),
      { initialProps: { onTasksChange: first } },
    );

    expect(first).not.toHaveBeenCalled();

    act(() => result.current.updateTask('1', { name: 'Renamed' }));
    expect(first).toHaveBeenCalledTimes(1);
    expect(first.mock.calls[0]![0].find((t: GanttTask) => t.id === '1')?.name).toBe('Renamed');

    // Regression: a new callback identity with an unchanged list must not
    // re-fire a duplicate notification.
    const second = vi.fn();
    rerender({ onTasksChange: second });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();

    // The latest callback is the one invoked on the next edit.
    act(() => result.current.updateTask('1', { name: 'Renamed again' }));
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('settles when the consumer feeds the list straight back as `tasks`', () => {
    // `onTasksChange={(t) => setTasks(t)}` is the shape consumers actually
    // write. It used to hang: the notification re-seeded `tasks`, the re-seed
    // produced a fresh tasksList identity with identical content, and that
    // re-fired the notification ("Maximum update depth exceeded").
    const onTasksChange = vi.fn();
    let current = seed;
    const { result, rerender } = renderHook(
      ({ tasks }) =>
        // Fresh inline callback every render, exactly as in the JSX form.
        useTaskList(tasks, undefined, { onTasksChange: (t) => onTasksChange(t) }),
      { initialProps: { tasks: current } },
    );

    act(() => result.current.updateTask('1', { name: 'Renamed' }));
    expect(onTasksChange).toHaveBeenCalledTimes(1);

    // The consumer re-seeds with what it was just handed, repeatedly. Each pass
    // must be silent, or the real app spins.
    for (let i = 0; i < 5; i += 1) {
      current = onTasksChange.mock.calls.at(-1)![0] as GanttTask[];
      rerender({ tasks: current });
      expect(onTasksChange).toHaveBeenCalledTimes(1);
    }

    // The edit survived the round-trips rather than being replayed or lost.
    expect(result.current.tasksList.find((t) => t.id === '1')?.name).toBe('Renamed');
    expect(result.current.tasksList).toHaveLength(2);

    // A genuine edit still notifies, and undo/redo do too.
    act(() => result.current.updateTask('2', { name: 'Also renamed' }));
    expect(onTasksChange).toHaveBeenCalledTimes(2);
    act(() => result.current.undo());
    expect(onTasksChange).toHaveBeenCalledTimes(3);
    act(() => result.current.redo());
    expect(onTasksChange).toHaveBeenCalledTimes(4);
  });

  it('re-seeding after a create neither duplicates nor drops the task', () => {
    // Replaying the log against a seed that already contains the created task
    // is safe because the resolved map is keyed by id — but assert it, since
    // the round-trip above depends on it.
    const onTasksChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ tasks }) => useTaskList(tasks, undefined, { onTasksChange }),
      { initialProps: { tasks: seed } },
    );

    act(() =>
      result.current.createTask(
        { id: '3', name: 'QA', startDate: new Date(2026, 1, 16), endDate: new Date(2026, 1, 28) },
        '2',
      ),
    );
    const notified = onTasksChange.mock.calls.at(-1)![0] as GanttTask[];
    expect(notified.map((t) => t.id)).toEqual(['1', '2', '3']);

    rerender({ tasks: notified });
    expect(result.current.tasksList.map((t) => t.id)).toEqual(['1', '2', '3']);
  });

  it('fires onTaskCreate after the created task is committed', () => {
    const seen: GanttTask['id'][][] = [];
    const { result } = renderHook(() =>
      useTaskList(seed, undefined, {
        onTaskCreate: () => {
          seen.push(result.current.tasksList.map((t) => t.id));
        },
      }),
    );

    const created: GanttTask = {
      id: '3',
      name: 'QA',
      startDate: new Date('2026-02-16'),
      endDate: new Date('2026-02-28'),
    };
    act(() => result.current.createTask(created));
    // flushSync in createTask commits the new task before the callback runs.
    expect(seen).toEqual([['1', '2', '3']]);
  });
});
