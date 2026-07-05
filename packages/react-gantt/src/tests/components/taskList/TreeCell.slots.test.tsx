import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TreeCell } from '../../../components/taskList/TreeCell';
import type { TreeCellOwnerState } from '../../../components/taskList/TreeCell';

const CustomButton = (props: React.ComponentProps<'button'>) => (
  <button type="button" data-testid="custom" {...props} />
);

describe('<TreeCell /> slots', () => {
  it('renders the default expand button and toggles on click', () => {
    const onToggleExpand = vi.fn();
    const { getByRole } = render(
      <TreeCell
        taskId={7}
        depth={0}
        isParent
        isExpanded={false}
        onToggleExpand={onToggleExpand}
      >
        Task name
      </TreeCell>,
    );
    const button = getByRole('button', { name: 'Expand' });
    expect(button.textContent).toBe('▸');
    fireEvent.click(button);
    expect(onToggleExpand).toHaveBeenCalledWith(7);
  });

  it('shows the collapse glyph and label when expanded', () => {
    const { getByRole } = render(
      <TreeCell taskId={1} depth={0} isParent isExpanded onToggleExpand={vi.fn()}>
        x
      </TreeCell>,
    );
    const button = getByRole('button', { name: 'Collapse' });
    expect(button.textContent).toBe('▾');
  });

  it('renders a placeholder (no button) for leaf rows', () => {
    const { queryByRole } = render(
      <TreeCell
        taskId={1}
        depth={0}
        isParent={false}
        isExpanded={false}
        onToggleExpand={vi.fn()}
      >
        x
      </TreeCell>,
    );
    expect(queryByRole('button')).toBeNull();
  });

  it('merges slotProps.expandButton.className with the internal class', () => {
    const { getByRole } = render(
      <TreeCell
        taskId={1}
        depth={0}
        isParent
        isExpanded={false}
        onToggleExpand={vi.fn()}
        slotProps={{ expandButton: { className: 'custom-toggle' } }}
      >
        x
      </TreeCell>,
    );
    const button = getByRole('button');
    expect(button.className).toMatch(/expandBtn/);
    expect(button.className).toMatch(/custom-toggle/);
  });

  it('lets slotProps.expandButton.children override the glyph', () => {
    const { getByRole } = render(
      <TreeCell
        taskId={1}
        depth={0}
        isParent
        isExpanded={false}
        onToggleExpand={vi.fn()}
        slotProps={{ expandButton: { children: 'ICON' } }}
      >
        x
      </TreeCell>,
    );
    expect(getByRole('button').textContent).toBe('ICON');
  });

  it('replaces the button via slots and still fires the merged onClick', () => {
    const onToggleExpand = vi.fn();
    const { getByTestId } = render(
      <TreeCell
        taskId={42}
        depth={0}
        isParent
        isExpanded={false}
        onToggleExpand={onToggleExpand}
        slots={{ expandButton: CustomButton }}
      >
        x
      </TreeCell>,
    );
    const button = getByTestId('custom');
    fireEvent.click(button);
    expect(onToggleExpand).toHaveBeenCalledWith(42);
  });

  it('passes ownerState to the function form of slotProps', () => {
    const spy = vi.fn((_: TreeCellOwnerState) => ({}));
    render(
      <TreeCell
        taskId={9}
        depth={3}
        isParent
        isExpanded
        onToggleExpand={vi.fn()}
        slotProps={{ expandButton: spy }}
      >
        x
      </TreeCell>,
    );
    expect(spy).toHaveBeenCalledWith({
      taskId: 9,
      depth: 3,
      isParent: true,
      isExpanded: true,
    });
  });

  it('applies depth-based indentation to the root', () => {
    const { container } = render(
      <TreeCell taskId={1} depth={2} isParent isExpanded={false} onToggleExpand={vi.fn()}>
        x
      </TreeCell>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.paddingLeft).toBe('32px'); // 2 * INDENT_PX (16)
  });
});
