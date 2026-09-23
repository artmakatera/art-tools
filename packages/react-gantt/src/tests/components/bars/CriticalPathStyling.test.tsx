import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskBar } from "../../../components/bars/taskBar/TaskBar";
import { ProjectBar } from "../../../components/bars/projectBar/ProjectBar";
import { MilestoneBar } from "../../../components/bars/milestoneBar/MilestoneBar";
import taskStyles from "../../../components/bars/taskBar/TaskBar.module.css";
import projectStyles from "../../../components/bars/projectBar/ProjectBar.module.css";
import milestoneStyles from "../../../components/bars/milestoneBar/MilestoneBar.module.css";

const noop = () => {};

describe("<TaskBar /> critical path", () => {
  const baseProps = {
    width: 100,
    height: 20,
    left: 0,
    top: 0,
    colWidth: 30,
    title: "My task",
    progress: 40,
    onProgressChange: noop,
    onProgressEnd: noop,
    onResize: noop,
    onResizeEnd: noop,
    onMove: noop,
    onMoveEnd: noop,
  };

  it("carries no critical class by default", () => {
    const { container } = render(<TaskBar {...baseProps} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain(taskStyles.critical);
    expect(root.className).not.toMatch(/am-gantt-bar-task--critical/);
  });

  it("adds the critical class and hook class when isCritical is set", () => {
    const { container } = render(<TaskBar {...baseProps} isCritical />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain(taskStyles.critical);
    expect(root.className).toMatch(/am-gantt-bar-task--critical/);
  });

  it("passes isCritical through to the ownerState", () => {
    const spy = vi.fn((_: unknown) => ({}));
    render(<TaskBar {...baseProps} isCritical slotProps={{ root: spy }} />);
    const arg = spy.mock.calls[0]![0] as { isCritical: boolean };
    expect(arg.isCritical).toBe(true);
  });
});

describe("<ProjectBar /> critical path", () => {
  const baseProps = {
    width: 100,
    height: 20,
    left: 0,
    top: 0,
    colWidth: 30,
    title: "My project",
    progress: 40,
    onProgressChange: noop,
    onProgressEnd: noop,
    onMove: noop,
    onMoveEnd: noop,
  };

  it("carries no critical class by default", () => {
    const { container } = render(<ProjectBar {...baseProps} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain(projectStyles.critical);
  });

  it("adds the critical class when isCritical is set", () => {
    const { container } = render(<ProjectBar {...baseProps} isCritical />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain(projectStyles.critical);
  });
});

describe("<MilestoneBar /> critical path", () => {
  const baseProps = {
    size: 20,
    centerLeft: 50,
    top: 0,
    colWidth: 30,
    title: "My milestone",
    onMove: noop,
    onMoveEnd: noop,
  };

  it("carries no critical class on the shape by default", () => {
    const { container } = render(<MilestoneBar {...baseProps} />);
    const shape = container.querySelector(".milestoneShape") as HTMLElement;
    expect(shape.className).not.toContain(milestoneStyles.critical);
  });

  it("adds the critical class to the shape, not the root, when isCritical is set", () => {
    const { container } = render(<MilestoneBar {...baseProps} isCritical />);
    const root = container.firstElementChild as HTMLElement;
    const shape = container.querySelector(".milestoneShape") as HTMLElement;
    expect(shape.className).toContain(milestoneStyles.critical);
    expect(root.className).not.toContain(milestoneStyles.critical);
  });
});
