import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TaskBar } from '../../../components/bars/taskBar/TaskBar';
import { ProjectBar } from '../../../components/bars/projectBar/ProjectBar';
import { MilestoneBar } from '../../../components/bars/milestoneBar/MilestoneBar';
import { BarProgress } from '../../../components/bars/progress/BarProgress';

const noop = () => {};

const CustomRoot = (props: { className?: string; children?: React.ReactNode }) => (
  <div data-testid="custom-root" className={props.className}>
    {props.children}
  </div>
);

const CustomShape = (props: { className?: string }) => (
  <div data-testid="custom-shape" className={props.className} />
);

describe('<TaskBar /> slots', () => {
  const baseProps = {
    width: 100,
    height: 20,
    left: 0,
    top: 0,
    colWidth: 30,
    title: 'My task',
    progress: 40,
    onProgressChange: noop,
    onProgressEnd: noop,
    onResize: noop,
    onResizeEnd: noop,
    onMove: noop,
    onMoveEnd: noop,
  };

  it('renders defaults with the hook class, inner and label', () => {
    const { container, getByText } = render(<TaskBar {...baseProps} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/task/);
    expect(root.className).toMatch(/am-gantt-bar-task/);
    expect(container.querySelector('.taskInner')).not.toBeNull();
    const label = getByText('My task');
    expect(label.className).toMatch(/taskContent/);
  });

  it('merges slotProps.root.className with the internal class', () => {
    const { container } = render(
      <TaskBar {...baseProps} slotProps={{ root: { className: 'custom-root' } }} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/task/);
    expect(root.className).toMatch(/am-gantt-bar-task/);
    expect(root.className).toMatch(/custom-root/);
  });

  it('merges slotProps.inner.className with the internal class', () => {
    const { container } = render(
      <TaskBar {...baseProps} slotProps={{ inner: { className: 'custom-inner' } }} />,
    );
    const inner = container.querySelector('.taskInner') as HTMLElement;
    expect(inner.className).toMatch(/custom-inner/);
  });

  it('replaces the root via slots', () => {
    const { getByTestId } = render(
      <TaskBar {...baseProps} slots={{ root: CustomRoot }} />,
    );
    expect(getByTestId('custom-root')).not.toBeNull();
  });

  it('lets slotProps.label.children override the title text', () => {
    const { queryByText, getByText } = render(
      <TaskBar {...baseProps} slotProps={{ label: { children: 'OVERRIDE' } }} />,
    );
    expect(queryByText('My task')).toBeNull();
    expect(getByText('OVERRIDE').className).toMatch(/taskContent/);
  });
});

describe('<ProjectBar /> slots', () => {
  const baseProps = {
    width: 100,
    height: 20,
    left: 0,
    top: 0,
    colWidth: 30,
    title: 'My project',
    progress: 40,
    onProgressChange: noop,
    onProgressEnd: noop,
    onMove: noop,
    onMoveEnd: noop,
  };

  it('renders defaults with the project class, inner and label', () => {
    const { container, getByText } = render(<ProjectBar {...baseProps} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/project/);
    expect(container.querySelector('.projectInner')).not.toBeNull();
    expect(getByText('My project').className).toMatch(/projectContent/);
  });

  it('merges slotProps.root.className with the internal class', () => {
    const { container } = render(
      <ProjectBar {...baseProps} slotProps={{ root: { className: 'custom-root' } }} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/project/);
    expect(root.className).toMatch(/custom-root/);
  });

  it('replaces the root via slots', () => {
    const { getByTestId } = render(
      <ProjectBar {...baseProps} slots={{ root: CustomRoot }} />,
    );
    expect(getByTestId('custom-root')).not.toBeNull();
  });

  it('lets slotProps.label.children override the title text', () => {
    const { queryByText, getByText } = render(
      <ProjectBar {...baseProps} slotProps={{ label: { children: 'OVERRIDE' } }} />,
    );
    expect(queryByText('My project')).toBeNull();
    expect(getByText('OVERRIDE')).not.toBeNull();
  });
});

describe('<MilestoneBar /> slots', () => {
  const baseProps = {
    size: 20,
    centerLeft: 50,
    top: 0,
    colWidth: 30,
    title: 'My milestone',
    onMove: noop,
    onMoveEnd: noop,
  };

  it('renders defaults with the milestone class and diamond shape', () => {
    const { container } = render(<MilestoneBar {...baseProps} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/milestone/);
    expect(container.querySelector('.milestoneShape')).not.toBeNull();
  });

  it('merges slotProps.shape.className with the internal class', () => {
    const { container } = render(
      <MilestoneBar {...baseProps} slotProps={{ shape: { className: 'custom-shape' } }} />,
    );
    const shape = container.querySelector('.milestoneShape') as HTMLElement;
    expect(shape.className).toMatch(/custom-shape/);
  });

  it('replaces the shape via slots', () => {
    const { getByTestId } = render(
      <MilestoneBar {...baseProps} slots={{ shape: CustomShape }} />,
    );
    expect(getByTestId('custom-shape')).not.toBeNull();
  });

  it('replaces the root via slots', () => {
    const { getByTestId } = render(
      <MilestoneBar {...baseProps} slots={{ root: CustomRoot }} />,
    );
    expect(getByTestId('custom-root')).not.toBeNull();
  });
});

describe('<BarProgress /> slots', () => {
  const baseProps = {
    width: 100,
    height: 20,
    progress: 50,
  };

  it('renders the default progress fill', () => {
    const { container } = render(<BarProgress {...baseProps} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/barProgress/);
    expect(root.style.width).toBe('50px');
  });

  it('merges slotProps.root.className with the internal class', () => {
    const { container } = render(
      <BarProgress {...baseProps} slotProps={{ root: { className: 'custom-progress' } }} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/barProgress/);
    expect(root.className).toMatch(/custom-progress/);
  });

  it('replaces the root via slots', () => {
    const { getByTestId } = render(
      <BarProgress {...baseProps} slots={{ root: CustomRoot }} />,
    );
    expect(getByTestId('custom-root')).not.toBeNull();
  });
});
