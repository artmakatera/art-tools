import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Gantt } from '../../Gantt';
import type { GanttTask } from '../../types';

// Two roots; the first has two children, so posinset/setsize differ per group.
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

/** The task-list pane's rows, in DOM order. */
function listRows(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('.taskList .rows .row')];
}

function renderGantt(props: Partial<React.ComponentProps<typeof Gantt>> = {}) {
  return render(<Gantt tasks={tasks} height={400} {...props} />);
}

describe('treegrid structure', () => {
  it('exposes one treegrid per pane, each with its own label', () => {
    const { getByRole } = renderGantt();
    expect(getByRole('treegrid', { name: 'Tasks' })).toBeInTheDocument();
    expect(getByRole('treegrid', { name: 'Timeline' })).toBeInTheDocument();
  });

  it('reports the full row count, not the virtualized window', () => {
    const { getByRole } = renderGantt();
    // Task list counts its header as row 1; the timeline has no header row.
    expect(getByRole('treegrid', { name: 'Tasks' })).toHaveAttribute('aria-rowcount', '5');
    expect(getByRole('treegrid', { name: 'Timeline' })).toHaveAttribute('aria-rowcount', '4');
  });

  it('numbers task-list rows after the header row', () => {
    const { container, getByRole } = renderGantt();
    const header = within(getByRole('treegrid', { name: 'Tasks' })).getAllByRole('row')[0]!;
    expect(header).toHaveAttribute('aria-rowindex', '1');
    expect(listRows(container).map((r) => r.getAttribute('aria-rowindex'))).toEqual([
      '2',
      '3',
      '4',
      '5',
    ]);
  });

  it('describes each row’s depth and position among its visible siblings', () => {
    const { container } = renderGantt();
    const meta = listRows(container).map((r) => ({
      level: r.getAttribute('aria-level'),
      pos: r.getAttribute('aria-posinset'),
      size: r.getAttribute('aria-setsize'),
    }));
    expect(meta).toEqual([
      { level: '1', pos: '1', size: '2' }, // p1 — root group of 2
      { level: '2', pos: '1', size: '2' }, // c1 — child group of 2
      { level: '2', pos: '2', size: '2' }, // c2
      { level: '1', pos: '2', size: '2' }, // p2
    ]);
  });

  it('marks only branch rows as expandable', () => {
    const { container } = renderGantt();
    const expanded = listRows(container).map((r) => r.getAttribute('aria-expanded'));
    // Leaves must omit the attribute entirely; `false` would announce them as
    // collapsed branches.
    expect(expanded).toEqual(['true', null, null, null]);
  });

  it('updates counts and drops descendants when a branch collapses', () => {
    const { container, getByRole, getByLabelText } = renderGantt();
    fireEvent.click(getByLabelText('Collapse'));

    const rows = listRows(container);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute('aria-expanded', 'false');
    expect(getByRole('treegrid', { name: 'Tasks' })).toHaveAttribute('aria-rowcount', '3');
    expect(rows.map((r) => r.getAttribute('aria-rowindex'))).toEqual(['2', '3']);
    expect(rows.map((r) => r.getAttribute('aria-posinset'))).toEqual(['1', '2']);
  });

  it('wraps every task-list cell in a gridcell with a column index', () => {
    const { container } = renderGantt();
    const cells = [...listRows(container)[0]!.querySelectorAll('[role="gridcell"]')];
    expect(cells).toHaveLength(5); // DEFAULT_COLUMNS
    expect(cells.map((c) => c.getAttribute('aria-colindex'))).toEqual(['1', '2', '3', '4', '5']);
  });

  it('gives each header cell a columnheader role and index', () => {
    const { getByRole } = renderGantt();
    const headers = within(getByRole('treegrid', { name: 'Tasks' })).getAllByRole(
      'columnheader',
    );
    expect(headers).toHaveLength(5);
    expect(headers.map((h) => h.getAttribute('aria-colindex'))).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
    ]);
  });

  it('names the timeline cell with the schedule the bar conveys visually', () => {
    const { getByRole } = renderGantt();
    const timeline = getByRole('treegrid', { name: 'Timeline' });
    const cells = within(timeline).getAllByRole('gridcell');
    expect(cells).toHaveLength(4);
    // Dates are locale-formatted, so assert on the parts we control.
    expect(cells[1]).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Wireframes'),
    );
    expect(cells[1]?.getAttribute('aria-label')).toMatch(/0% complete$/);
  });

  it('names a milestone cell without an end date', () => {
    const { getByRole } = renderGantt({
      tasks: [
        {
          id: 'm',
          name: 'Launch',
          type: 'milestone',
          startDate: new Date('2026-03-01'),
        },
      ],
    });
    const cell = within(getByRole('treegrid', { name: 'Timeline' })).getByRole('gridcell');
    expect(cell.getAttribute('aria-label')).toMatch(/^Launch, milestone /);
  });

  it('hides the decorative calendar, column, and link layers', () => {
    const { container } = renderGantt();
    expect(container.querySelector('.calendar')).toHaveAttribute('aria-hidden');
    expect(container.querySelector('.cols')).toHaveAttribute('aria-hidden');
  });

  it('keeps the timeline self-sufficient when the task list is hidden', () => {
    const { queryByRole, getByRole } = renderGantt({ hideTaskList: true });
    expect(queryByRole('treegrid', { name: 'Tasks' })).toBeNull();
    const timeline = getByRole('treegrid', { name: 'Timeline' });
    expect(timeline).toHaveAttribute('aria-rowcount', '4');
    expect(within(timeline).getAllByRole('row')[0]).toHaveAttribute('aria-level', '1');
  });
});

describe('tab stops', () => {
  it('leaves no pointer-only affordance in the tab order', () => {
    const { container } = renderGantt();
    const tabbable = [
      ...container.querySelectorAll<HTMLElement>(
        '.expandBtn, .resizer, .handle',
      ),
    ];
    expect(tabbable.length).toBeGreaterThan(0);
    for (const el of tabbable) {
      expect(el.tabIndex).toBe(-1);
    }
  });

  it('gives the expand button an explicit button type', () => {
    const { getByLabelText } = renderGantt();
    expect(getByLabelText('Collapse')).toHaveAttribute('type', 'button');
  });

  it('names both connector handles after their task', () => {
    const { getByLabelText } = renderGantt();
    expect(getByLabelText('Link from start of Wireframes')).toBeInTheDocument();
    expect(getByLabelText('Link from end of Wireframes')).toBeInTheDocument();
  });
});
