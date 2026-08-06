import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Gantt } from '../../Gantt';
import type { GanttTask } from '../../types';

const ROW_HEIGHT = 20;
const VIEWPORT_ROWS = 10;
const TASK_COUNT = 300;

// Comfortably past UNMEASURED_FALLBACK_COUNT (100), so the window is a real
// window even before clientHeight is stubbed.
const tasks: GanttTask[] = Array.from({ length: TASK_COUNT }, (_, i) => ({
  id: `t${i}`,
  name: `Task ${i}`,
  startDate: new Date(2026, 0, 1 + i),
  endDate: new Date(2026, 0, 2 + i),
}));

// jsdom has no layout: every clientHeight is 0, which makes `rangeFromOffset`
// take its UNMEASURED_FALLBACK_COUNT path and render 100 rows — so a
// virtualization bug looks like a pass. Stub the metric on the prototype
// *before* mounting, so the layout-effect measure in useViewportMeasure sees a
// real viewport on the very first commit.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(
    ROW_HEIGHT * VIEWPORT_ROWS,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Let useViewportMeasure's rAF-coalesced re-measure land. */
async function flushMeasure() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 32));
  });
}

/** data-task-id of whatever currently holds DOM focus. */
function focusedId(): string | undefined {
  return (document.activeElement as HTMLElement | null)?.dataset.taskId;
}

function setup() {
  const utils = render(<Gantt tasks={tasks} height={200} rowHeight={ROW_HEIGHT} />);
  const scroller = utils.container.querySelector<HTMLDivElement>('.taskList .body')!;
  // jsdom clamps scrollTop to 0 for elements it believes aren't scrollable
  // (scrollHeight is 0 without layout), which would silently pin the window to
  // the top. Back it with a plain field so writes stick.
  let scrollTop = 0;
  Object.defineProperty(scroller, 'scrollTop', {
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = value;
    },
    configurable: true,
  });

  const scrollTo = async (top: number) => {
    scroller.scrollTop = top;
    fireEvent.scroll(scroller);
    await flushMeasure();
  };
  const rows = () => [
    ...utils.container.querySelectorAll<HTMLElement>('.taskList .rows .row'),
  ];
  const rowIds = () => rows().map((r) => r.dataset.taskId);
  const enterList = () => {
    const stop = utils.container.querySelector<HTMLElement>(
      '.taskList .rows .row[tabindex="0"]',
    )!;
    act(() => {
      stop.focus();
    });
    return stop;
  };

  return { ...utils, scroller, scrollTo, rows, rowIds, enterList };
}

describe('focus under virtualization', () => {
  it('really is virtualized — guards the assertions below', async () => {
    const { scrollTo, rows, rowIds } = setup();
    await scrollTo(0);
    // Viewport + overscan, nowhere near the 100-row unmeasured fallback.
    expect(rows().length).toBeLessThan(30);
    expect(rowIds()).toContain('t0');

    await scrollTo(ROW_HEIGHT * 200);
    // The window genuinely moved, so "row t0 is still rendered" below is a real
    // statement about pinning rather than an artefact of rendering everything.
    expect(rowIds()).toContain('t200');
    expect(rowIds()).not.toContain('t100');
  });

  it('keeps the cursor row mounted after scrolling it out of the window', async () => {
    const { scrollTo, rowIds, enterList } = setup();
    await scrollTo(0);

    enterList();
    expect(focusedId()).toBe('t0');

    await scrollTo(ROW_HEIGHT * 200);
    const ids = rowIds();
    expect(ids).not.toContain('t100'); // the window moved away from row 0

    // ...yet the cursor's row is still rendered, so focus never fell to <body>.
    // This is the whole reason roving tabindex is viable in a virtualized grid.
    expect(ids).toContain('t0');
    expect(document.activeElement).not.toBe(document.body);
    expect(focusedId()).toBe('t0');
  });

  it('drops the pin once the cursor moves back inside the window', async () => {
    const { scrollTo, rowIds, enterList } = setup();
    await scrollTo(0);
    enterList();
    await scrollTo(ROW_HEIGHT * 200);
    expect(rowIds()).toContain('t0');

    // Move the cursor into the visible range; the pin disappears.
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    await flushMeasure();
    expect(rowIds()).not.toContain('t0');
  });

  it('never renders the cursor row twice', async () => {
    const { scrollTo, rowIds, enterList } = setup();
    await scrollTo(0);
    enterList();
    await scrollTo(ROW_HEIGHT * 200);
    const ids = rowIds();
    expect(new Set(ids).size).toBe(ids.length);

    // And once the window scrolls back over it, still exactly one.
    await scrollTo(0);
    const back = rowIds();
    expect(back.filter((id) => id === 't0')).toHaveLength(1);
  });

  it('scrolls the cursor back into view when navigating', async () => {
    const { scroller, scrollTo, enterList } = setup();
    await scrollTo(0);
    enterList();
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(focusedId()).toBe(`t${TASK_COUNT - 1}`);
    expect(scroller.scrollTop).toBeGreaterThan(0);
  });

  it('pages by a viewport at a time', async () => {
    const { scrollTo, enterList } = setup();
    await scrollTo(0);
    enterList();
    fireEvent.keyDown(document.activeElement!, { key: 'PageDown' });
    // pageRowsFor = floor(clientHeight / rowHeight) - 1 = 9
    expect(focusedId()).toBe('t9');
  });

  it('recovers the cursor when its task is removed from the list', async () => {
    const { rerender, scrollTo, enterList } = setup();
    await scrollTo(0);
    enterList();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(focusedId()).toBe('t2');

    // Drop the focused task; the cursor should land on whatever takes its place
    // rather than stranding on a row that no longer exists.
    rerender(
      <Gantt
        tasks={tasks.filter((t) => t.id !== 't2')}
        height={200}
        rowHeight={ROW_HEIGHT}
      />,
    );
    expect(focusedId()).toBe('t3');
  });
});
