import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CalendarRow } from '../../../components/calendar/CalendarRow';
import { buildDates } from '../../../core/dateUtils';
import type { Scale } from '../../../types';

const dayScale: Scale = {
  unit: 'day',
  step: 1,
  format: (d) => String(d.getDate()),
};

const monthScale: Scale = {
  unit: 'month',
  step: 1,
  format: (d) => `${d.getFullYear()}-${d.getMonth() + 1}`,
};

function getCells(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLDivElement>('.cell'));
}

describe('<CalendarRow />', () => {
  it('renders no cells when dates is empty', () => {
    const { container } = render(
      <CalendarRow scale={dayScale} dates={[]} colWidth={40} rowHeight={32} />,
    );
    expect(getCells(container)).toHaveLength(0);
  });

  it('renders one cell per date when each date is its own group', () => {
    // 2026-01-05 is a Monday; 5 weekdays then weekend.
    const dates = buildDates(new Date(2026, 0, 5), 5);
    const { container } = render(
      <CalendarRow scale={dayScale} dates={dates} colWidth={40} rowHeight={32} />,
    );
    const cells = getCells(container);
    expect(cells).toHaveLength(5);
    expect(cells.map((c) => c.textContent)).toEqual(['5', '6', '7', '8', '9']);
  });

  it('sets the row height from rowHeight', () => {
    const { container } = render(
      <CalendarRow
        scale={dayScale}
        dates={buildDates(new Date(2026, 0, 5), 1)}
        colWidth={40}
        rowHeight={48}
      />,
    );
    const row = container.querySelector<HTMLDivElement>('.row');
    expect(row?.style.height).toBe('48px');
  });

  it('sizes each cell as count * colWidth', () => {
    const dates = buildDates(new Date(2026, 0, 5), 3);
    const { container } = render(
      <CalendarRow scale={dayScale} dates={dates} colWidth={40} rowHeight={32} />,
    );
    const cells = getCells(container);
    cells.forEach((cell) => {
      expect(cell.style.width).toBe('40px');
    });
  });

  it('collapses consecutive same-period dates into a single cell', () => {
    // 31 days in January + 5 days in February -> two month groups.
    const dates = buildDates(new Date(2026, 0, 1), 36);
    const { container } = render(
      <CalendarRow scale={monthScale} dates={dates} colWidth={10} rowHeight={32} />,
    );
    const cells = getCells(container);
    expect(cells).toHaveLength(2);
    expect(cells[0]!.textContent).toBe('2026-1');
    expect(cells[0]!.style.width).toBe('310px'); // 31 * 10
    expect(cells[1]!.textContent).toBe('2026-2');
    expect(cells[1]!.style.width).toBe('50px'); // 5 * 10
  });

  it('calls scale.format with the start date of each group', () => {
    const format = vi.fn((d: Date) => String(d.getDate()));
    const scale: Scale = { unit: 'day', step: 1, format };
    const dates = buildDates(new Date(2026, 0, 5), 3);
    render(<CalendarRow scale={scale} dates={dates} colWidth={40} rowHeight={32} />);
    expect(format).toHaveBeenCalledTimes(3);
    expect(format).toHaveBeenNthCalledWith(1, dates[0]);
    expect(format).toHaveBeenNthCalledWith(2, dates[1]);
    expect(format).toHaveBeenNthCalledWith(3, dates[2]);
  });

  it('does not apply the weekend class by default', () => {
    // 2026-01-03 is Saturday, 2026-01-04 is Sunday.
    const dates = [new Date(2026, 0, 3), new Date(2026, 0, 4)];
    const { container } = render(
      <CalendarRow scale={dayScale} dates={dates} colWidth={40} rowHeight={32} />,
    );
    getCells(container).forEach((cell) => {
      expect(cell.className).not.toMatch(/cellWeekend/);
    });
  });

  it('applies the weekend class to weekend cells when highlightWeekends is true', () => {
    // 2026-01-02 Fri, 03 Sat, 04 Sun, 05 Mon.
    const dates = buildDates(new Date(2026, 0, 2), 4);
    const { container } = render(
      <CalendarRow
        scale={dayScale}
        dates={dates}
        colWidth={40}
        rowHeight={32}
        highlightWeekends
      />,
    );
    const cells = getCells(container);
    expect(cells).toHaveLength(4);
    expect(cells[0]!.className).not.toMatch(/cellWeekend/); // Fri
    expect(cells[1]!.className).toMatch(/cellWeekend/); // Sat
    expect(cells[2]!.className).toMatch(/cellWeekend/); // Sun
    expect(cells[3]!.className).not.toMatch(/cellWeekend/); // Mon
  });

  it('checks the group start (not arbitrary inner dates) for weekend status', () => {
    // A month group starting on a weekday should not get the weekend class,
    // even though it contains weekend days.
    const dates = buildDates(new Date(2026, 0, 1), 31); // Jan 1 (Thu) ... Jan 31
    const { container } = render(
      <CalendarRow
        scale={monthScale}
        dates={dates}
        colWidth={10}
        rowHeight={32}
        highlightWeekends
      />,
    );
    const cells = getCells(container);
    expect(cells).toHaveLength(1);
    expect(cells[0]!.className).not.toMatch(/cellWeekend/);
  });

  it('always applies the base cell class alongside the weekend modifier', () => {
    const dates = buildDates(new Date(2026, 0, 3), 1); // Saturday
    const { container } = render(
      <CalendarRow
        scale={dayScale}
        dates={dates}
        colWidth={40}
        rowHeight={32}
        highlightWeekends
      />,
    );
    const cell = getCells(container)[0]!;
    expect(cell.className).toMatch(/\bcell\b/);
    expect(cell.className).toMatch(/cellWeekend/);
  });
});
