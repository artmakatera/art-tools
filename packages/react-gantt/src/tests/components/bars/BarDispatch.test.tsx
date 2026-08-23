import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Gantt } from "../../../Gantt";
import { CONNECTOR_HANDLE_SIZE } from "../../../core/constants";
import type { GanttTask } from "../../../types";

/** A single root task; `overrides` sets (or omits) the `type`. */
function oneTask(overrides: Partial<GanttTask>): GanttTask[] {
  return [
    {
      id: "t1",
      name: "T",
      startDate: new Date(2026, 0, 1),
      endDate: new Date(2026, 0, 5),
      duration: 4,
      progress: 0,
      parentId: null,
      ...overrides,
    },
  ];
}

// TaskBar's root carries the global `am-gantt-bar-task` hook class; ProjectBar
// uses `.project`; MilestoneBar renders `.milestoneShape`.
function bars(container: HTMLElement) {
  return {
    task: container.querySelector(".am-gantt-bar-task"),
    summary: container.querySelector(".project"),
    milestone: container.querySelector(".milestoneShape"),
  };
}

describe("Bar type dispatch", () => {
  it('renders a task bar for an untyped task (undefined behaves as "task")', () => {
    const { container } = render(<Gantt tasks={oneTask({})} height={300} hideTaskList />);
    const b = bars(container);
    expect(b.task).not.toBeNull();
    expect(b.summary).toBeNull();
    expect(b.milestone).toBeNull();
  });

  it('renders a task bar for type "task"', () => {
    const { container } = render(
      <Gantt tasks={oneTask({ type: "task" })} height={300} hideTaskList />,
    );
    const b = bars(container);
    expect(b.task).not.toBeNull();
    expect(b.summary).toBeNull();
    expect(b.milestone).toBeNull();
  });

  it('renders a milestone shape for type "milestone"', () => {
    const { container } = render(
      <Gantt tasks={oneTask({ type: "milestone" })} height={300} hideTaskList />,
    );
    const b = bars(container);
    expect(b.milestone).not.toBeNull();
    expect(b.task).toBeNull();
    expect(b.summary).toBeNull();
  });

  it('renders a summary (project) bar for type "summary"', () => {
    const { container } = render(
      <Gantt tasks={oneTask({ type: "summary" })} height={300} hideTaskList />,
    );
    const b = bars(container);
    expect(b.summary).not.toBeNull();
    expect(b.task).toBeNull();
    expect(b.milestone).toBeNull();
  });
});

/**
 * The handles bracket the bar's painted box. Read off inline styles rather than
 * rects, because jsdom reports every rect as zero.
 */
function handleEdges(container: HTMLElement) {
  const [start, end] = Array.from(container.querySelectorAll(".handle")) as HTMLElement[];
  return {
    startRight: Number.parseFloat(start!.style.left) + CONNECTOR_HANDLE_SIZE,
    endLeft: Number.parseFloat(end!.style.left),
  };
}

function barBox(bar: HTMLElement) {
  return {
    left: Number.parseFloat(bar.style.left),
    right: Number.parseFloat(bar.style.left) + Number.parseFloat(bar.style.width),
  };
}

describe("connector handle placement", () => {
  it("brackets the painted diamond on a milestone, not its zero-width date span", () => {
    const { container } = render(
      <Gantt tasks={oneTask({ type: "milestone" })} height={300} hideTaskList />,
    );

    // `.milestoneShape` is the clip-path diamond; `.milestone` is the box it fills.
    const diamond = barBox(container.querySelector(".milestone") as HTMLElement);
    const { startRight, endLeft } = handleEdges(container);

    // A milestone is an instant, so its span is 0 wide and centred on the date.
    // Feeding that span landed the end handle exactly on the diamond's centre
    // and the start handle over its left half — so the centre is what to pin.
    expect(endLeft).toBeGreaterThan((diamond.left + diamond.right) / 2);

    // Bracketing, with a pixel of tolerance on the right: the end handle is
    // pulled in by one so it meets the clipped diamond rather than its box.
    expect(startRight).toBe(diamond.left);
    expect(endLeft).toBeGreaterThanOrEqual(diamond.right - 1);
    expect(endLeft).toBeLessThanOrEqual(diamond.right);
  });

  it("still brackets the date span on a task bar", () => {
    const { container } = render(
      <Gantt tasks={oneTask({ type: "task" })} height={300} hideTaskList />,
    );

    const bar = barBox(container.querySelector(".am-gantt-bar-task") as HTMLElement);
    const { startRight, endLeft } = handleEdges(container);

    expect(startRight).toBe(bar.left);
    expect(endLeft).toBe(bar.right);
  });
});
