import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Gantt, type GanttTask, type TaskDependency } from "../../index";

const tasks: GanttTask[] = [
  { id: "a", name: "A", startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 5) },
  { id: "b", name: "B", startDate: new Date(2026, 0, 5), endDate: new Date(2026, 0, 9) },
];

const dependencies: TaskDependency[] = [{ from: "a", to: "b", type: "FS" }];

describe("<Gantt criticalPath />", () => {
  it("renders no critical styling by default", () => {
    const { container } = render(<Gantt tasks={tasks} dependencies={dependencies} height={400} />);
    expect(container.querySelector(".am-gantt-bar-task--critical")).toBeNull();
    expect(container.querySelector(".segmentCritical")).toBeNull();
  });

  it("highlights the critical chain when enabled", () => {
    const { container } = render(
      <Gantt tasks={tasks} dependencies={dependencies} height={400} criticalPath />,
    );
    expect(container.querySelectorAll(".am-gantt-bar-task--critical").length).toBe(2);
    expect(container.querySelector(".segmentCritical")).not.toBeNull();
  });

  it("highlights nothing when there is slack, even with the flag on", () => {
    const slackTasks: GanttTask[] = [
      { id: "a", name: "A", startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 5) },
      // b has 5 days of slack before it actually needs to start.
      { id: "b", name: "B", startDate: new Date(2026, 0, 10), endDate: new Date(2026, 0, 14) },
    ];
    const { container } = render(
      <Gantt tasks={slackTasks} dependencies={dependencies} height={400} criticalPath />,
    );
    // b is the sink and always critical by construction; a has slack.
    expect(container.querySelectorAll(".am-gantt-bar-task--critical").length).toBe(1);
    expect(container.querySelector(".segmentCritical")).toBeNull();
  });
});
