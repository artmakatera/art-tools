import { act, fireEvent, render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Gantt,
  type BaselineTooltipProps,
  type GanttHandle,
  type GanttTask,
  GanttProvider,
  GanttGrid,
} from "../../index";

const date = (day: number) => new Date(2026, 0, day);

const task: GanttTask = {
  id: "a",
  name: "A",
  startDate: date(10),
  endDate: date(12),
  baselines: [
    { id: "one", title: "Original", startDate: date(2), endDate: date(5) },
    { id: "two", startDate: date(6), endDate: date(8) },
  ],
};

function Tooltip({ baseline, displayEnd, children }: BaselineTooltipProps) {
  return (
    <span data-plan={baseline.title} data-end={displayEnd?.getDate()}>
      {children}
    </span>
  );
}

describe("baseline rendering", () => {
  it("recalculates equal rows and lane positions from the common baseline layout", () => {
    const tasks: GanttTask[] = [task, { ...task, id: "b", baselines: undefined }];
    const { container, rerender } = render(<Gantt tasks={tasks} baselineLayout={{ height: 6 }} />);
    const rows = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          '[role="grid"] [role="row"][aria-rowindex="3"], [role="grid"] [role="row"][aria-rowindex="4"]',
        ),
      );
    const lines = () => container.querySelectorAll<HTMLElement>(".am-gantt-baseline");
    expect(rows().map((row) => row.style.height)).toEqual(["52px", "52px"]);
    expect(lines()[0]!.style.height).toBe("6px");
    expect(lines()[0]!.style.top).toBe("37px");
    expect(lines()[1]!.style.top).toBe("45px");
    const listRows = container.querySelectorAll<HTMLElement>(
      '[role="treegrid"] [role="row"][aria-level]',
    );
    expect(Array.from(listRows, (row) => row.style.height)).toEqual(["52px", "52px"]);

    rerender(
      <Gantt tasks={tasks} rowHeight={44} baselineLayout={{ height: 4, padding: 3, gap: 5 }} />,
    );
    expect(rows().map((row) => row.style.height)).toEqual(["63px", "63px"]);
    expect(lines()[1]!.style.top).toBe("56px");
    expect(lines()[0]!.style.top).toBe("47px");
    rerender(<Gantt tasks={tasks} baselineLayout={{ padding: 0, gap: 0 }} />);
    expect(rows().map((row) => row.style.height)).toEqual(["42px", "42px"]);
    expect(lines()[0]!.style.top).toBe("36px");
    expect(lines()[1]!.style.top).toBe("39px");
    expect(lines()[0]!.style.height).toBe("3px");
    rerender(<Gantt tasks={tasks} baselineLayout={{}} />);
    expect(rows().map((row) => row.style.height)).toEqual(["46px", "46px"]);
    rerender(<Gantt tasks={tasks} baselineLayout={{ height: 6 }} showBaselines={false} />);
    expect(rows().map((row) => row.style.height)).toEqual(["36px", "36px"]);
  });

  it("uses the provider's line thickness for milestone size and centering", () => {
    const milestone: GanttTask = { ...task, type: "milestone" };
    const { container } = render(
      <GanttProvider tasks={[milestone]} baselineLayout={{ height: 8 }}>
        <GanttGrid />
      </GanttProvider>,
    );
    const line = container.querySelector<HTMLElement>(".am-gantt-baseline")!;
    expect(line.style.height).toBe("8px");
    expect(line.style.width).toBe("8px");
    const { container: defaultContainer } = render(<Gantt tasks={[milestone]} />);
    const defaultLine = defaultContainer.querySelector<HTMLElement>(".am-gantt-baseline")!;
    expect(defaultLine.style.height).toBe("3px");
    expect(parseFloat(line.style.left) + 4).toBe(parseFloat(defaultLine.style.left) + 1.5);
  });

  it("toggles plans, row strips, descriptions, and axis extent without losing edits", () => {
    const apiRef = createRef<GanttHandle>();
    const onTasksChange = vi.fn();
    const props = { tasks: [task], height: 300, rowHeight: 44, padDays: 0, apiRef, onTasksChange };
    const { container, rerender } = render(<Gantt {...props} />);
    const row = () =>
      container.querySelector<HTMLElement>('[role="grid"] [role="row"][aria-rowindex="3"]')!;
    const grid = () => container.querySelector('[role="grid"]')!;
    const columnsWithPlans = Number(grid().getAttribute("aria-colcount"));
    expect(container.querySelectorAll(".am-gantt-baseline")).toHaveLength(2);
    act(() => apiRef.current!.updateTask("a", { progress: 50 }));
    onTasksChange.mockClear();

    rerender(<Gantt {...props} showBaselines={false} />);
    expect(container.querySelectorAll(".am-gantt-baseline")).toHaveLength(0);
    expect(row().style.height).toBe("44px");
    expect(row().querySelector(".am-gantt-bar-task")?.hasAttribute("aria-description")).toBe(false);
    expect(Number(grid().getAttribute("aria-colcount"))).toBeLessThan(columnsWithPlans);
    expect(onTasksChange).not.toHaveBeenCalled();
    const scrollGrid = grid() as HTMLElement;
    Object.defineProperty(scrollGrid, "clientWidth", { value: 100, configurable: true });
    scrollGrid.scrollLeft = 999;
    act(() => apiRef.current!.revealTask("a", { vertical: false, horizontal: true }));
    expect(scrollGrid.scrollLeft).toBe(0);

    rerender(<Gantt {...props} showBaselines />);
    expect(container.querySelectorAll(".am-gantt-baseline")).toHaveLength(2);
    expect(row().style.height).toBe("54px");
    expect(row().querySelector(".am-gantt-bar-task")?.getAttribute("aria-description")).toContain(
      "Original",
    );
    expect(Number(grid().getAttribute("aria-colcount"))).toBe(columnsWithPlans);
    expect(onTasksChange).not.toHaveBeenCalled();
    act(() => apiRef.current!.undo());
    expect(onTasksChange.mock.lastCall?.[0][0].progress).toBeUndefined();
    expect(container.querySelectorAll(".am-gantt-baseline")).toHaveLength(2);
    expect(task.baselines).toHaveLength(2);
  });

  it("supports the composable provider and hides every task type's plans", () => {
    const tasks: GanttTask[] = [
      task,
      { ...task, id: "summary", type: "summary" },
      { ...task, id: "milestone", type: "milestone" },
    ];
    const { container, rerender } = render(
      <GanttProvider tasks={tasks} height={300} showBaselines={false}>
        <GanttGrid />
      </GanttProvider>,
    );
    expect(container.querySelectorAll(".am-gantt-baseline")).toHaveLength(0);
    expect(container.querySelectorAll("[aria-description]")).toHaveLength(0);
    rerender(
      <GanttProvider tasks={tasks} height={300} showBaselines>
        <GanttGrid />
      </GanttProvider>,
    );
    expect(container.querySelectorAll(".am-gantt-baseline")).toHaveLength(6);
  });

  it("renders plans below the live bar, describes them, and does not select on click", () => {
    const onTaskClick = vi.fn();
    const { container } = render(
      <Gantt tasks={[task]} height={300} rowHeight={44} onTaskClick={onTaskClick} />,
    );
    const row = container.querySelector('[role="row"][aria-rowindex="3"]') as HTMLElement;
    const baselines = row.querySelectorAll<HTMLElement>(".am-gantt-baseline");
    expect(baselines).toHaveLength(2);
    expect(row.style.height).toBe("54px");
    expect(
      container.querySelector('[role="treegrid"] [role="gridcell"]')?.getAttribute("style"),
    ).toContain("height: 44px");
    expect(baselines[0]!.style.top).toBe("45px");
    expect(baselines[0]!.style.height).toBe("3px");
    expect(baselines[1]!.style.top).toBe("50px");
    expect(
      Number.parseInt(baselines[1]!.style.top) -
        Number.parseInt(baselines[0]!.style.top) -
        Number.parseInt(baselines[0]!.style.height),
    ).toBe(2);
    expect(baselines[0]!.title).toContain("Original");
    expect(baselines[0]!.title).toContain("2026");
    expect(row.querySelector(".am-gantt-bar-task")?.getAttribute("aria-description")).toContain(
      "Original",
    );
    fireEvent.click(baselines[0]!);
    expect(onTaskClick).not.toHaveBeenCalled();
  });

  it("renders explicit summary and milestone plans", () => {
    const tasks: GanttTask[] = [
      {
        id: "summary",
        name: "S",
        type: "summary",
        startDate: date(10),
        endDate: date(12),
        baselines: [{ id: "s", startDate: date(2), endDate: date(4) }],
      },
      {
        id: "milestone",
        name: "M",
        type: "milestone",
        startDate: date(10),
        baselines: [{ id: "m", startDate: date(3) }],
      },
    ];
    const { container } = render(<Gantt tasks={tasks} height={300} />);
    const lines = container.querySelectorAll<HTMLElement>(".am-gantt-baseline");
    expect(lines).toHaveLength(2);
    expect(lines[1]!.className).toContain("milestone");
    expect(lines[1]!.title).toContain("2026");
  });

  it("does not derive a summary baseline from its children", () => {
    const tasks: GanttTask[] = [
      { id: "parent", name: "Parent", type: "summary", startDate: date(10), endDate: date(12) },
      {
        id: "child",
        parentId: "parent",
        name: "Child",
        startDate: date(10),
        endDate: date(12),
        baselines: [{ id: "old", startDate: date(2), endDate: date(4) }],
      },
    ];
    const { container } = render(<Gantt tasks={tasks} height={300} />);
    const parent = container.querySelector<HTMLElement>(
      '[role="grid"] [role="row"][aria-rowindex="3"]',
    )!;
    const child = container.querySelector<HTMLElement>(
      '[role="grid"] [role="row"][aria-rowindex="4"]',
    )!;
    expect(parent.querySelectorAll(".am-gantt-baseline")).toHaveLength(0);
    expect(child.querySelectorAll(".am-gantt-baseline")).toHaveLength(1);
  });

  it("passes plan data to a custom tooltip and allows per-plan styling", () => {
    const onTaskClick = vi.fn();
    const onBaselineClick = vi.fn();
    const { container } = render(
      <Gantt
        tasks={[task]}
        height={300}
        onTaskClick={onTaskClick}
        bars={{
          baseline: {
            slots: { tooltip: Tooltip },
            slotProps: {
              root: ({ index }) => ({
                style: { opacity: index === 0 ? 0.5 : 1 },
                onClick: onBaselineClick,
              }),
            },
          },
        }}
      />,
    );
    const first = container.querySelector<HTMLElement>(".am-gantt-baseline")!;
    expect(first.title).toBe("");
    expect(first.style.opacity).toBe("0.5");
    expect(first.parentElement?.getAttribute("data-plan")).toBe("Original");
    expect(first.parentElement?.getAttribute("data-end")).toBe("4");
    fireEvent.click(first);
    expect(onBaselineClick).toHaveBeenCalledOnce();
    expect(onTaskClick).not.toHaveBeenCalled();
  });

  it("takes external plans after a local edit and keeps them through undo/redo", () => {
    const apiRef = createRef<GanttHandle>();
    const { container, rerender } = render(<Gantt tasks={[task]} height={300} apiRef={apiRef} />);
    act(() => apiRef.current!.updateTask("a", { progress: 50 }));
    const next: GanttTask = {
      ...task,
      baselines: [{ id: "new", startDate: date(1), endDate: date(3) }],
    };
    rerender(<Gantt tasks={[next]} height={300} apiRef={apiRef} />);
    const titles = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(".am-gantt-baseline"),
        (line) => line.title,
      );
    expect(titles()).toHaveLength(1);
    expect(titles()[0]).toContain("new");
    act(() => apiRef.current!.undo());
    expect(titles()[0]).toContain("new");
    act(() => apiRef.current!.redo());
    expect(titles()[0]).toContain("new");
  });
});
