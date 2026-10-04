import { act, fireEvent, render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Gantt, type BaselineTooltipProps, type GanttHandle, type GanttTask } from "../../index";

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
