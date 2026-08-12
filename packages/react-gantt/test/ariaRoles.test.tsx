import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Gantt, type GanttLabels, type GanttTask } from '../src';

const tasks: GanttTask[] = [
  {
    id: '1',
    name: 'Design phase',
    startDate: new Date('2026-03-03'),
    endDate: new Date('2026-03-12'),
    progress: 40,
    type: 'summary',
  },
  {
    id: '1a',
    name: 'Wireframes',
    startDate: new Date('2026-03-03'),
    endDate: new Date('2026-03-06'),
    progress: 100,
    parentId: '1',
  },
  {
    id: '1b',
    name: 'Visual design',
    startDate: new Date('2026-03-07'),
    endDate: new Date('2026-03-12'),
    progress: 10,
    parentId: '1',
  },
  {
    id: '2',
    name: 'Kickoff',
    startDate: new Date('2026-03-16'),
    type: 'milestone',
  },
];

/** Rows in the task-list pane, in DOM order (excludes the header row). */
function listRows(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('.taskList .rows .row'));
}

/**
 * Bar rows in the timeline pane. CSS modules resolve to non-scoped class names in
 * tests, so `.body` alone would also match the task-list scroll container —
 * everything here is anchored on `.gridWrapper`.
 */
function barRows(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('.gridWrapper .body > .row'));
}

function barCells(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('.gridWrapper .body > .row [role="gridcell"]'));
}

describe('task-list treegrid semantics', () => {
  it('exposes the pane as a named treegrid with full row/column counts', () => {
    const { getByRole } = render(<Gantt tasks={tasks} height={400} />);
    const treegrid = getByRole('treegrid', { name: 'Task list' });
    // 4 tasks + the header row.
    expect(treegrid.getAttribute('aria-rowcount')).toBe('5');
    expect(treegrid.getAttribute('aria-colcount')).toBe('5');
  });

  it('makes the header row 1 and each column a columnheader', () => {
    const { getByRole, getAllByRole } = render(<Gantt tasks={tasks} height={400} />);
    const treegrid = getByRole('treegrid', { name: 'Task list' });
    const header = within(treegrid).getByRole('row', { name: /Task Name/ });
    expect(header.getAttribute('aria-rowindex')).toBe('1');

    const headers = getAllByRole('columnheader');
    const listHeaders = headers.filter((h) => h.closest('.taskList'));
    expect(listHeaders).toHaveLength(5);
    expect(listHeaders.map((h) => h.getAttribute('aria-colindex'))).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
    ]);
  });

  it('numbers data rows after the header row', () => {
    const { container } = render(<Gantt tasks={tasks} height={400} />);
    const rows = listRows(container);
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.getAttribute('aria-rowindex'))).toEqual(['2', '3', '4', '5']);
  });

  it('marks the tree column as the row header and the rest as gridcells', () => {
    const { container } = render(<Gantt tasks={tasks} height={400} />);
    const row = listRows(container)[0]!;
    const cells = Array.from(row.children) as HTMLElement[];
    // DEFAULT_COLUMNS: actions, name (tree), start, end, progress.
    expect(cells.map((c) => c.getAttribute('role'))).toEqual([
      'gridcell',
      'rowheader',
      'gridcell',
      'gridcell',
      'gridcell',
    ]);
    expect(cells.map((c) => c.getAttribute('aria-colindex'))).toEqual(['1', '2', '3', '4', '5']);
  });

  it('conveys tree depth, expansion and sibling position', () => {
    const { container } = render(<Gantt tasks={tasks} height={400} />);
    const [parent, firstChild, secondChild, milestone] = listRows(container);

    expect(parent!.getAttribute('aria-level')).toBe('1');
    expect(parent!.getAttribute('aria-expanded')).toBe('true');
    expect(parent!.getAttribute('aria-posinset')).toBe('1');
    expect(parent!.getAttribute('aria-setsize')).toBe('2');

    expect(firstChild!.getAttribute('aria-level')).toBe('2');
    expect(firstChild!.getAttribute('aria-posinset')).toBe('1');
    expect(firstChild!.getAttribute('aria-setsize')).toBe('2');
    expect(secondChild!.getAttribute('aria-posinset')).toBe('2');
    expect(secondChild!.getAttribute('aria-setsize')).toBe('2');

    // Leaves are not "collapsed" — aria-expanded must be absent, not false.
    expect(firstChild!.hasAttribute('aria-expanded')).toBe(false);
    expect(milestone!.getAttribute('aria-posinset')).toBe('2');
  });

  it('flips aria-expanded and drops the collapsed subtree on toggle', () => {
    const { container, getByRole } = render(<Gantt tasks={tasks} height={400} />);
    fireEvent.click(getByRole('button', { name: 'Collapse' }));

    const rows = listRows(container);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.getAttribute('aria-expanded')).toBe('false');
    // Row numbering and the total both shrink with the collapsed subtree.
    expect(rows.map((r) => r.getAttribute('aria-rowindex'))).toEqual(['2', '3']);
    expect(getByRole('treegrid').getAttribute('aria-rowcount')).toBe('3');
  });

  it('marks only the selected row aria-selected', () => {
    const { container } = render(<Gantt tasks={tasks} height={400} />);
    expect(container.querySelectorAll('.taskList [aria-selected="true"]')).toHaveLength(0);

    fireEvent.click(listRows(container)[1]!);
    const selected = container.querySelectorAll('.taskList .rows [aria-selected="true"]');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toBe(listRows(container)[1]);
  });

  it('hides the virtualization spacers and column dividers from assistive tech', () => {
    const { container } = render(<Gantt tasks={tasks} height={400} />);
    const rowsContainer = container.querySelector('.taskList .rows')!;
    expect(rowsContainer.getAttribute('role')).toBe('rowgroup');
    // The two spacer divs bracket the rendered rows.
    for (const spacer of [rowsContainer.firstElementChild!, rowsContainer.lastElementChild!]) {
      expect(spacer.getAttribute('aria-hidden')).toBe('true');
      expect(spacer.getAttribute('role')).toBe('presentation');
    }
    for (const divider of container.querySelectorAll('.taskList .divider')) {
      expect(divider.getAttribute('aria-hidden')).toBe('true');
    }
  });
});

describe('virtualized treegrid', () => {
  const many: GanttTask[] = Array.from({ length: 500 }, (_, i) => ({
    id: String(i),
    name: `Task ${i}`,
    startDate: new Date('2026-03-02'),
    endDate: new Date('2026-03-06'),
  }));

  it('reports the full row count while rendering only a window', () => {
    const { container, getByRole } = render(<Gantt tasks={many} height={400} rowHeight={20} />);
    const treegrid = getByRole('treegrid');
    expect(treegrid.getAttribute('aria-rowcount')).toBe('501');
    // jsdom reports zero-size viewports, so only the overscan renders — the point
    // is that the DOM holds far fewer rows than aria-rowcount advertises.
    const rendered = listRows(container);
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(many.length);
  });

  it('keeps aria-rowindex absolute when the window is scrolled', async () => {
    const { container } = render(<Gantt tasks={many} height={400} rowHeight={20} />);
    const body = container.querySelector('.taskList .body') as HTMLElement;

    // jsdom has no layout; emulate a viewport, then scroll well past the top.
    Object.defineProperty(body, 'clientHeight', { value: 200, configurable: true });
    Object.defineProperty(body, 'scrollHeight', { value: many.length * 20, configurable: true });
    body.scrollTop = 2000;
    fireEvent.scroll(body);

    // Viewport measurement is coalesced into a rAF, so wait for the re-window.
    await waitFor(() => {
      const first = listRows(container)[0]!;
      // Row 1 is the header, so the first data row is 2 when unscrolled.
      expect(Number(first.getAttribute('aria-rowindex'))).toBeGreaterThan(2);
    });

    // Every rendered row's aria-rowindex still points at its true position in the
    // full list, which is the whole point of the attribute under virtualization.
    for (const row of listRows(container)) {
      const rowIndex = Number(row.getAttribute('aria-rowindex'));
      expect(row.textContent).toContain(`Task ${rowIndex - 2}`);
    }
  });
});

describe('timeline grid semantics', () => {
  it('exposes the timeline as a named grid sized to the date axis', () => {
    const { getByRole, container } = render(<Gantt tasks={tasks} height={400} />);
    const grid = getByRole('grid', { name: 'Timeline' });
    const dateColumns = container.querySelectorAll('.cols > *').length;
    expect(dateColumns).toBeGreaterThan(0);
    expect(Number(grid.getAttribute('aria-colcount'))).toBeGreaterThanOrEqual(dateColumns);
    // 2 calendar header rows (month + day) + 4 task rows.
    expect(grid.getAttribute('aria-rowcount')).toBe('6');
  });

  it('names calendar header cells with the full period, not the abbreviated text', () => {
    const { container } = render(<Gantt tasks={tasks} height={400} />);
    const cells = Array.from(
      container.querySelectorAll('.calendar .cell'),
    ) as HTMLElement[];
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell.getAttribute('role')).toBe('columnheader');
      expect(cell.hasAttribute('aria-colindex')).toBe(true);
      expect(cell.getAttribute('aria-label')).toBeTruthy();
    }

    // The month row spans many day columns and spells out the month.
    const monthCell = cells.find((c) => Number(c.getAttribute('aria-colspan')) > 1)!;
    expect(monthCell.getAttribute('aria-label')).toMatch(/March 2026/);

    // A day cell shows "3" but announces the whole date.
    const dayCell = cells.find((c) => c.textContent === '3')!;
    expect(dayCell.getAttribute('aria-label')).not.toBe('3');
    expect(dayCell.getAttribute('aria-label')).toMatch(/March/);
  });

  it('gives calendar rows sequential aria-rowindex values', () => {
    const { container } = render(<Gantt tasks={tasks} height={400} />);
    const rows = Array.from(container.querySelectorAll('.calendar .row')) as HTMLElement[];
    expect(rows.map((r) => r.getAttribute('aria-rowindex'))).toEqual(['1', '2']);
    expect(container.querySelector('.calendar')!.getAttribute('role')).toBe('rowgroup');
  });

  it('makes each bar a single labelled gridcell inside a numbered row', () => {
    const { container } = render(<Gantt tasks={tasks} height={400} />);
    const rows = barRows(container);
    expect(rows).toHaveLength(4);
    // Task rows start after the two calendar header rows.
    expect(rows.map((r) => r.getAttribute('aria-rowindex'))).toEqual(['3', '4', '5', '6']);

    const labels = rows.map(
      (r) => r.querySelector('[role="gridcell"]')!.getAttribute('aria-label'),
    );
    // The summary's progress is the rollup of its children (100% and 10%), not the
    // 40% on the task itself — the label reports what the bar actually shows.
    expect(labels[0]).toBe('Design phase, summary, Mar 3, 2026 to Mar 12, 2026, 55% complete');
    expect(labels[1]).toBe('Wireframes, task, Mar 3, 2026 to Mar 6, 2026, 100% complete');
    // Milestones are a point in time, so no end date and no progress.
    expect(labels[3]).toBe('Kickoff, milestone, Mar 16, 2026');
  });

  it('positions each bar gridcell on the date axis', () => {
    const { container } = render(<Gantt tasks={tasks} height={400} colWidth={30} />);
    const cells = barCells(container);
    for (const cell of cells) {
      expect(Number(cell.getAttribute('aria-colindex'))).toBeGreaterThanOrEqual(1);
      expect(Number(cell.getAttribute('aria-colspan'))).toBeGreaterThanOrEqual(1);
    }

    // For bars laid out from their left edge, the announced column matches the
    // rendered offset. (A milestone is positioned by its centre, so its DOM `left`
    // is half a diamond to the left of the day it actually falls on.)
    const [summary, wireframes, visual] = cells;
    for (const cell of [summary!, wireframes!, visual!]) {
      expect(Number(cell.getAttribute('aria-colindex'))).toBe(
        Math.max(1, Math.floor(parseFloat(cell.style.left) / 30) + 1),
      );
    }

    // The summary starts on the same day as its first child; the second child
    // starts later.
    expect(Number(summary!.getAttribute('aria-colindex'))).toBe(
      Number(wireframes!.getAttribute('aria-colindex')),
    );
    expect(Number(visual!.getAttribute('aria-colindex'))).toBeGreaterThan(
      Number(wireframes!.getAttribute('aria-colindex')),
    );
  });

  it('hides the bar internals so the gridcell label is the whole announcement', () => {
    const { container } = render(<Gantt tasks={tasks} height={400} />);
    const inner = barCells(container)[0]!.firstElementChild!;
    expect(inner.getAttribute('aria-hidden')).toBe('true');
    // The decorative column striping is not read as a row.
    expect(container.querySelector('.cols')!.getAttribute('role')).toBe('presentation');
  });

  it('keeps the dependency-link layer decorative', () => {
    const { container } = render(
      <Gantt
        tasks={tasks}
        height={400}
        dependencies={[{ from: '1a', to: '1b', type: 'FS' }]}
      />,
    );
    const layer = container.querySelector('.layer')!;
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    expect(layer.getAttribute('role')).toBe('presentation');
  });

  it('marks the selected bar aria-selected', () => {
    const { container } = render(<Gantt tasks={tasks} height={400} />);
    const cells = barCells(container);
    expect(container.querySelectorAll('.gridWrapper [aria-selected="true"]')).toHaveLength(0);

    fireEvent.click(cells[1]!);
    const selected = container.querySelectorAll('.gridWrapper .body [aria-selected="true"]');
    expect(selected).toHaveLength(1);
    expect(selected[0]!.getAttribute('aria-label')).toMatch(/^Wireframes/);
  });
});

describe('mouse-only affordances stay out of the a11y tree', () => {
  it('only exposes the expand toggles and row action buttons', () => {
    const { getAllByRole } = render(<Gantt tasks={tasks} height={400} />);
    const names = getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    // One expand toggle (the summary) + 3 action buttons per row.
    expect(names).toEqual([
      'Edit Design phase',
      'Add task after Design phase',
      'Delete Design phase',
      'Collapse',
      'Edit Wireframes',
      'Add task after Wireframes',
      'Delete Wireframes',
      'Edit Visual design',
      'Add task after Visual design',
      'Delete Visual design',
      'Edit Kickoff',
      'Add task after Kickoff',
      'Delete Kickoff',
    ]);
  });

  it('keeps every drag grip aria-hidden and untabbable', () => {
    const { container } = render(<Gantt tasks={tasks} height={400} />);
    // Scoped to the bar rows: `.handle` is also the pane splitter's class, which is
    // a legitimately exposed separator.
    const grips = Array.from(
      container.querySelectorAll(
        '.gridWrapper .body > .row :is(.handle, .resizer, .barProgressResizeHandle)',
      ),
    ) as HTMLElement[];
    expect(grips.length).toBeGreaterThan(0);
    for (const grip of grips) {
      expect(grip.getAttribute('aria-hidden')).toBe('true');
      expect(grip.tabIndex).toBe(-1);
    }
  });

  it('names the pane splitter without making it a keyboard widget', () => {
    const { getByRole } = render(<Gantt tasks={tasks} height={400} />);
    const separator = getByRole('separator', { name: 'Resize task list' });
    expect(separator.getAttribute('aria-orientation')).toBe('vertical');
    expect(separator.hasAttribute('tabindex')).toBe(false);
  });

  it('groups the two panes under one accessible name', () => {
    const { getByRole } = render(<Gantt tasks={tasks} height={400} />);
    const group = getByRole('group', { name: 'Gantt chart' });
    expect(within(group).getByRole('treegrid')).toBeTruthy();
    expect(within(group).getByRole('grid')).toBeTruthy();
  });
});

describe('labels prop', () => {
  const labels: GanttLabels = {
    gantt: 'Projektplan',
    taskList: 'Aufgabenliste',
    timeline: 'Zeitachse',
    expand: 'Aufklappen',
    collapse: 'Zuklappen',
    resizeTaskList: 'Breite ändern',
    editTask: (task) => `${task.name} bearbeiten`,
    bar: (task, { progress }) => `${task.name} — ${progress}%`,
  };

  it('overrides every accessible name it supplies', () => {
    const { getByRole, container } = render(
      <Gantt tasks={tasks} height={400} labels={labels} />,
    );
    expect(getByRole('group', { name: 'Projektplan' })).toBeTruthy();
    expect(getByRole('treegrid', { name: 'Aufgabenliste' })).toBeTruthy();
    expect(getByRole('grid', { name: 'Zeitachse' })).toBeTruthy();
    expect(getByRole('separator', { name: 'Breite ändern' })).toBeTruthy();
    expect(getByRole('button', { name: 'Zuklappen' })).toBeTruthy();
    expect(getByRole('button', { name: 'Design phase bearbeiten' })).toBeTruthy();

    // 55% is the rollup of the summary's children, which is what the bar renders.
    expect(barCells(container)[0]!.getAttribute('aria-label')).toBe('Design phase — 55%');
  });

  it('keeps English defaults for keys it omits', () => {
    const { getByRole } = render(<Gantt tasks={tasks} height={400} labels={labels} />);
    // `deleteTask` was not overridden.
    expect(getByRole('button', { name: 'Delete Design phase' })).toBeTruthy();
  });
});
