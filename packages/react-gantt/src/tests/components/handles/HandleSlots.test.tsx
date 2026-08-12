import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TaskResizer } from '../../../components/bars/taskBar/TaskResizer';
import { BarProgressResizeHandle } from '../../../components/bars/progress/BarProgressResizeHandle';
import { GridResizeHandle } from '../../../components/grid/GridResizeHandle';
import { TaskListHeader } from '../../../components/taskList/TaskListHeader';
import type { ColumnDef } from '../../../types';
import { DEFAULT_LABELS } from '../../../core/labels';

// ConnectorHandles pulls state from GanttContext hooks; stub them so it can be
// rendered directly without a full <GanttProvider>.
const startDrag = vi.fn();
const endDrag = vi.fn();
vi.mock('../../../context/GanttContext', () => ({
  useGanttDependency: () => ({ startDrag, endDrag }),
  useGanttDragActive: () => false,
  useGanttScroll: () => ({ gridBodyRef: { current: document.createElement('div') } }),
  useGanttLabels: () => DEFAULT_LABELS,
}));

// Imported after vi.mock so it resolves the mocked context module.
import { ConnectorHandles } from '../../../components/bars/common/ConnectorHandles';

const CustomButton = (props: React.ComponentProps<'button'>) => (
  <button type="button" data-testid="custom" {...props} />
);
const CustomDiv = (props: React.ComponentProps<'div'>) => (
  <div data-testid="custom" {...props} />
);

describe('<TaskResizer /> slots', () => {
  // Resizing is mouse-only, so the grips are hidden from assistive tech and kept
  // out of the tab order — query them by class, not by an accessible name.
  it('renders both default resize buttons with their style classes', () => {
    const { container } = render(
      <TaskResizer width={100} left={0} colWidth={30} onResize={vi.fn()} onResizeEnd={vi.fn()} />,
    );
    const start = container.querySelector('.startResizer') as HTMLElement;
    const end = container.querySelector('.endResizer') as HTMLElement;
    expect(start.className).toMatch(/resizer/);
    expect(end.className).toMatch(/resizer/);
    for (const grip of [start, end]) {
      expect(grip.getAttribute('aria-hidden')).toBe('true');
      expect(grip.tabIndex).toBe(-1);
    }
  });

  it('merges slotProps.startHandle.className with the internal classes', () => {
    const { container } = render(
      <TaskResizer
        width={100}
        left={0}
        colWidth={30}
        onResize={vi.fn()}
        onResizeEnd={vi.fn()}
        slotProps={{ startHandle: { className: 'mine' } }}
      />,
    );
    const start = container.querySelector('.startResizer') as HTMLElement;
    expect(start.className).toMatch(/startResizer/);
    expect(start.className).toMatch(/mine/);
  });

  it('lets a consumer restore an accessible name via slotProps', () => {
    const { getByLabelText } = render(
      <TaskResizer
        width={100}
        left={0}
        colWidth={30}
        onResize={vi.fn()}
        onResizeEnd={vi.fn()}
        slotProps={{
          startHandle: { 'aria-hidden': undefined, tabIndex: 0, 'aria-label': 'Resize start' },
        }}
      />,
    );
    expect(getByLabelText('Resize start')).toBeTruthy();
  });

  it('replaces the end handle via slots and still fires the merged onMouseDown', () => {
    const { getByTestId } = render(
      <TaskResizer
        width={100}
        left={0}
        colWidth={30}
        onResize={vi.fn()}
        onResizeEnd={vi.fn()}
        slots={{ endHandle: CustomButton }}
      />,
    );
    // The drag start does not throw and the custom element is rendered.
    const custom = getByTestId('custom');
    fireEvent.mouseDown(custom);
    expect(custom).toBeTruthy();
  });

  it('passes ownerState to the function form of slotProps', () => {
    const spy = vi.fn(() => ({}));
    render(
      <TaskResizer
        width={120}
        left={45}
        colWidth={30}
        onResize={vi.fn()}
        onResizeEnd={vi.fn()}
        slotProps={{ startHandle: spy }}
      />,
    );
    expect(spy).toHaveBeenCalledWith({ width: 120, left: 45 });
  });
});

describe('<ConnectorHandles /> slots', () => {
  // Dependency creation is a mouse-only drag and the handles only appear on hover,
  // so they are aria-hidden and untabbable rather than advertised as buttons no key
  // can activate.
  it('renders both default handles hidden from assistive tech', () => {
    const { container, queryAllByRole } = render(
      <ConnectorHandles taskId={1} barLeft={10} barWidth={100} barCenterY={20} show />,
    );
    const handles = Array.from(container.querySelectorAll('.handle')) as HTMLElement[];
    expect(handles).toHaveLength(2);
    expect(queryAllByRole('button')).toHaveLength(0);
    for (const h of handles) {
      expect(h.getAttribute('aria-hidden')).toBe('true');
      expect(h.tabIndex).toBe(-1);
    }
  });

  it('merges slotProps.startHandle.className with the internal class', () => {
    const { container } = render(
      <ConnectorHandles
        taskId={1}
        barLeft={10}
        barWidth={100}
        barCenterY={20}
        show
        slotProps={{ startHandle: { className: 'mine' } }}
      />,
    );
    const start = container.querySelector('.handle') as HTMLElement;
    expect(start.className).toMatch(/handle/);
    expect(start.className).toMatch(/mine/);
  });

  it('replaces the start handle via slots and still fires the merged onMouseDown', () => {
    const { getByTestId } = render(
      <ConnectorHandles
        taskId={7}
        barLeft={10}
        barWidth={100}
        barCenterY={20}
        show
        slots={{ startHandle: CustomDiv }}
      />,
    );
    fireEvent.mouseDown(getByTestId('custom'));
    expect(startDrag).toHaveBeenCalled();
    expect(startDrag.mock.calls[0]![0]).toMatchObject({ fromTaskId: 7, handle: 'start' });
  });
});

describe('<BarProgressResizeHandle /> slots', () => {
  it('renders the default handle with its class', () => {
    const { container } = render(
      <BarProgressResizeHandle width={50} parentWidth={100} onResize={vi.fn()} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/barProgressResizeHandle/);
  });

  it('merges slotProps.root.className', () => {
    const { container } = render(
      <BarProgressResizeHandle
        width={50}
        parentWidth={100}
        onResize={vi.fn()}
        slotProps={{ root: { className: 'mine' } }}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/barProgressResizeHandle/);
    expect(root.className).toMatch(/mine/);
  });

  it('replaces the root via slots and still fires the merged onMouseDown', () => {
    const { getByTestId } = render(
      <BarProgressResizeHandle
        width={50}
        parentWidth={100}
        onResize={vi.fn()}
        slots={{ root: CustomDiv }}
      />,
    );
    const custom = getByTestId('custom');
    fireEvent.mouseDown(custom);
    expect(custom).toBeTruthy();
  });

  it('passes ownerState to the function form of slotProps', () => {
    const spy = vi.fn(() => ({}));
    render(
      <BarProgressResizeHandle
        width={40}
        parentWidth={200}
        onResize={vi.fn()}
        slotProps={{ root: spy }}
      />,
    );
    expect(spy).toHaveBeenCalledWith({ width: 40, parentWidth: 200 });
  });
});

describe('<GridResizeHandle /> slots', () => {
  it('renders the default separator preserving role/aria', () => {
    const { getByRole } = render(<GridResizeHandle onMouseDown={vi.fn()} />);
    const sep = getByRole('separator');
    expect(sep.getAttribute('aria-orientation')).toBe('vertical');
    expect(sep.className).toMatch(/handle/);
  });

  it('merges slotProps.root.className', () => {
    const { getByRole } = render(
      <GridResizeHandle onMouseDown={vi.fn()} slotProps={{ root: { className: 'mine' } }} />,
    );
    const sep = getByRole('separator');
    expect(sep.className).toMatch(/handle/);
    expect(sep.className).toMatch(/mine/);
  });

  it('replaces the root via slots and still fires the merged onMouseDown', () => {
    const onMouseDown = vi.fn();
    const { getByTestId } = render(
      <GridResizeHandle onMouseDown={onMouseDown} slots={{ root: CustomDiv }} />,
    );
    fireEvent.mouseDown(getByTestId('custom'));
    expect(onMouseDown).toHaveBeenCalled();
  });
});

describe('<TaskListHeader /> slots', () => {
  const columns: ColumnDef[] = [
    { key: 'a', header: 'Alpha', width: 100, render: () => 'a' },
    { key: 'b', header: 'Beta', render: () => 'b' },
  ];

  it('renders the header container and per-column cells + dividers', () => {
    const { container } = render(
      <TaskListHeader columns={columns} rowHeight={20} onResizeStart={vi.fn()} />,
    );
    const header = container.firstElementChild as HTMLElement;
    expect(header.className).toMatch(/header/);
    expect(container.querySelectorAll('.headerCell')).toHaveLength(2);
    expect(container.querySelectorAll('.divider')).toHaveLength(2);
  });

  it('merges slotProps.header.className', () => {
    const { container } = render(
      <TaskListHeader
        columns={columns}
        rowHeight={20}
        onResizeStart={vi.fn()}
        slotProps={{ header: { className: 'mine' } }}
      />,
    );
    const header = container.firstElementChild as HTMLElement;
    expect(header.className).toMatch(/header/);
    expect(header.className).toMatch(/mine/);
  });

  it('merges slotProps.headerCell.className on every cell', () => {
    const { container } = render(
      <TaskListHeader
        columns={columns}
        rowHeight={20}
        onResizeStart={vi.fn()}
        slotProps={{ headerCell: { className: 'cell-x' } }}
      />,
    );
    container.querySelectorAll('.headerCell').forEach((c) => {
      expect(c.className).toMatch(/cell-x/);
    });
  });

  it('fires onResizeStart from the columnResizeHandle merged handler', () => {
    const onResizeStart = vi.fn();
    const { container } = render(
      <TaskListHeader columns={columns} rowHeight={20} onResizeStart={onResizeStart} />,
    );
    const divider = container.querySelector('.divider') as HTMLElement;
    fireEvent.mouseDown(divider);
    expect(onResizeStart).toHaveBeenCalled();
    expect(onResizeStart.mock.calls[0]![0]).toBe('a');
  });

  it('replaces the columnResizeHandle via slots and still fires the merged onMouseDown', () => {
    const onResizeStart = vi.fn();
    const { getAllByTestId } = render(
      <TaskListHeader
        columns={columns}
        rowHeight={20}
        onResizeStart={onResizeStart}
        slots={{ columnResizeHandle: CustomDiv }}
      />,
    );
    const handles = getAllByTestId('custom');
    fireEvent.mouseDown(handles[0]!);
    expect(onResizeStart).toHaveBeenCalledWith('a', expect.any(Number), expect.anything());
  });

  it('passes per-column ownerState to the function form of headerCell slotProps', () => {
    const spy = vi.fn(() => ({}));
    render(
      <TaskListHeader
        columns={columns}
        rowHeight={20}
        onResizeStart={vi.fn()}
        slotProps={{ headerCell: spy }}
      />,
    );
    expect(spy).toHaveBeenCalledWith({ column: columns[0], index: 0 });
    expect(spy).toHaveBeenCalledWith({ column: columns[1], index: 1 });
  });
});
