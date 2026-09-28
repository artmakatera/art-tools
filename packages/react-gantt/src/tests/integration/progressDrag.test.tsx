import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Gantt } from "../../Gantt";
import rowCss from "../../components/bars/common/Row.module.css?inline";
import taskCss from "../../components/bars/taskBar/TaskBar.module.css?inline";
import projectCss from "../../components/bars/projectBar/ProjectBar.module.css?inline";
import milestoneCss from "../../components/bars/milestoneBar/MilestoneBar.module.css?inline";
import type { GanttTask } from "../../types";

const task: GanttTask = {
  id: "1",
  name: "Progress drag",
  startDate: new Date(2026, 0, 1),
  endDate: new Date(2026, 0, 15),
  progress: 40,
};

describe("progress dragging", () => {
  it.each([
    ["task", ".task"],
    ["summary", ".project"],
    ["milestone", ".milestone"],
  ] as const)(
    "puts the %s stacking context on the bar, leaving row borders below links",
    (type, selector) => {
      // jsdom does not hit-test. Check the actual stylesheet's stacking-context
      // boundary separately from the drag below: a z-index on the fill traps its
      // handle behind the later label even when the handle has a higher z-index.
      const style = document.createElement("style");
      style.textContent = [rowCss, taskCss, projectCss, milestoneCss].join("\n");
      document.head.append(style);
      try {
        const { container } = render(
          <Gantt tasks={[{ ...task, type }]} height={400} hideTaskList />,
        );
        const bar = container.querySelector<HTMLElement>(selector)!;
        const row = bar.closest('[role="row"]')!;

        expect(getComputedStyle(bar).zIndex).toBe("var(--am-gantt-task-bar-z-index, 3)");
        expect(getComputedStyle(row).zIndex).toBe("auto");
        const fill = bar.querySelector<HTMLElement>(".barProgress");
        if (type !== "milestone") {
          expect(fill).not.toBeNull();
          expect(getComputedStyle(fill!).zIndex).toBe("auto");
          expect(getComputedStyle(fill!.parentElement!).zIndex).toBe("auto");
        }
      } finally {
        style.remove();
      }
    },
  );

  it("previews and commits progress without moving or resizing the task", () => {
    const onTasksChange = vi.fn();
    const { container } = render(
      <Gantt tasks={[task]} height={400} hideTaskList onTasksChange={onTasksChange} />,
    );
    const bar = container.querySelector<HTMLElement>(".am-gantt-bar-task")!;
    const fill = bar.querySelector<HTMLElement>(".barProgress")!;
    const handle = bar.querySelector<HTMLElement>(".barProgressResizeHandle")!;
    const width = Number.parseFloat(bar.style.width);
    const left = bar.style.left;

    fireEvent.mouseDown(handle, { clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 100 + width * 0.2 });
    expect(Number.parseFloat(fill.style.width)).toBeCloseTo(width * 0.6);
    fireEvent.mouseUp(window);

    expect(onTasksChange).toHaveBeenCalled();
    const updated = onTasksChange.mock.lastCall![0][0] as GanttTask;
    expect(updated.progress).toBeCloseTo(60);
    expect(updated.startDate).toEqual(task.startDate);
    expect(updated.endDate).toEqual(task.endDate);
    expect(bar.style.left).toBe(left);
    expect(Number.parseFloat(bar.style.width)).toBe(width);
  });
});
