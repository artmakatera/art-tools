import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Gantt } from "../../../Gantt";
import { GanttBarTooltip } from "../../../components/bars/common/BarTooltip";
import type { BarTooltipProps } from "../../../components/bars/common/BarTooltip";
import type { GanttTask } from "../../../types";

function makeTasks(): GanttTask[] {
  return [
    {
      id: "t0",
      name: "Write the spec",
      startDate: new Date(2026, 0, 5),
      endDate: new Date(2026, 0, 10),
      progress: 40,
      type: "task",
      parentId: null,
    },
  ];
}

/**
 * Scoped by the bar's public hook class, not by `[role="gridcell"]` — the task
 * list is a treegrid whose cells match that role and come first in document
 * order. The bar's parent is the `row` carrying the hover handlers.
 */
function barAndRow(container: HTMLElement) {
  const bar = container.querySelector(".am-gantt-bar-task") as HTMLElement;
  return { bar, row: bar.parentElement as HTMLElement };
}

/** Records the props the slot was called with, so we can assert on them. */
function makeProbe() {
  const seen: BarTooltipProps[] = [];
  const Probe = (props: BarTooltipProps) => {
    seen.push(props);
    return <div data-testid="probe">{props.task.name}</div>;
  };
  return { seen, Probe };
}

describe("bar tooltip slot", () => {
  it("renders nothing and keeps the native title when no slot is configured", () => {
    const { container, queryByTestId } = render(<Gantt tasks={makeTasks()} height={400} />);
    const { bar } = barAndRow(container);

    expect(queryByTestId("probe")).toBeNull();
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
    expect(bar.getAttribute("title")).toBe("Write the spec");
  });

  it("mounts the slot on hover and unmounts on leave", () => {
    const { Probe } = makeProbe();
    const { container, queryByTestId } = render(
      <Gantt tasks={makeTasks()} height={400} bars={{ tooltip: { slots: { tooltip: Probe } } }} />,
    );
    const { row } = barAndRow(container);

    expect(queryByTestId("probe")).toBeNull();

    fireEvent.mouseEnter(row);
    expect(queryByTestId("probe")).not.toBeNull();

    fireEvent.mouseLeave(row);
    expect(queryByTestId("probe")).toBeNull();
  });

  it("suppresses the native title once a slot is configured, keeping aria-label", () => {
    const { Probe } = makeProbe();
    const { container } = render(
      <Gantt tasks={makeTasks()} height={400} bars={{ tooltip: { slots: { tooltip: Probe } } }} />,
    );
    const { bar } = barAndRow(container);

    expect(bar.getAttribute("title")).toBeNull();
    expect(bar.getAttribute("aria-label")).toBeTruthy();
  });

  it("hands the slot the task, resolved progress and an inclusive displayEnd", () => {
    const { seen, Probe } = makeProbe();
    const { container } = render(
      <Gantt tasks={makeTasks()} height={400} bars={{ tooltip: { slots: { tooltip: Probe } } }} />,
    );
    fireEvent.mouseEnter(barAndRow(container).row);

    const props = seen.at(-1)!;
    expect(props.task.id).toBe("t0");
    expect(props.progress).toBe(40);
    expect(props.open).toBe(true);
    // Stored end is the exclusive instant Jan 10; the inclusive date is Jan 9 (ADR-014).
    expect(props.displayEnd?.getDate()).toBe(9);
  });

  it("points anchorRef at the bar element, not at the row", () => {
    const { seen, Probe } = makeProbe();
    const { container } = render(
      <Gantt tasks={makeTasks()} height={400} bars={{ tooltip: { slots: { tooltip: Probe } } }} />,
    );
    const { bar, row } = barAndRow(container);
    fireEvent.mouseEnter(row);

    const props = seen.at(-1)!;
    expect(props.anchorRef.current).toBe(bar);
    expect(props.anchorRef.current).not.toBe(row);
    expect(props.anchorName).toMatch(/^--am-gantt-bar-/);
  });

  it("still renders under readOnly — a tooltip is information, not an affordance", () => {
    const { Probe } = makeProbe();
    const { container, queryByTestId } = render(
      <Gantt
        tasks={makeTasks()}
        height={400}
        readOnly
        bars={{ tooltip: { slots: { tooltip: Probe } } }}
      />,
    );
    fireEvent.mouseEnter(barAndRow(container).row);
    expect(queryByTestId("probe")).not.toBeNull();
  });

  it("merges slotProps.tooltip className and style into the slot", () => {
    const { container } = render(
      <Gantt
        tasks={makeTasks()}
        height={400}
        bars={{
          tooltip: {
            slots: { tooltip: GanttBarTooltip },
            slotProps: { tooltip: { className: "my-tip", style: { opacity: 0.5 } } },
          },
        }}
      />,
    );
    fireEvent.mouseEnter(barAndRow(container).row);

    const tip = container.querySelector('[role="tooltip"]') as HTMLElement;
    expect(tip).not.toBeNull();
    expect(tip.className).toMatch(/my-tip/);
    expect(tip.className).toMatch(/tooltip/); // internal default class survives
    expect(tip.style.opacity).toBe("0.5");
  });

  it("sets the anchor ident on the row only when a slot is configured", () => {
    const { Probe } = makeProbe();
    const withSlot = render(
      <Gantt tasks={makeTasks()} height={400} bars={{ tooltip: { slots: { tooltip: Probe } } }} />,
    );
    expect(
      barAndRow(withSlot.container).row.style.getPropertyValue("--am-gantt-bar-anchor"),
    ).toMatch(/^--am-gantt-bar-/);

    const without = render(<Gantt tasks={makeTasks()} height={400} />);
    expect(barAndRow(without.container).row.style.getPropertyValue("--am-gantt-bar-anchor")).toBe(
      "",
    );
  });

  it("GanttBarTooltip renders the name, dates and rounded progress", () => {
    const { container } = render(
      <Gantt
        tasks={makeTasks()}
        height={400}
        bars={{ tooltip: { slots: { tooltip: GanttBarTooltip } } }}
      />,
    );
    fireEvent.mouseEnter(barAndRow(container).row);

    // Scoped to the tooltip: the name and the dates also appear in the task list.
    const tip = container.querySelector('[role="tooltip"]') as HTMLElement;
    expect(tip.textContent).toContain("Write the spec");
    expect(tip.textContent).toContain("40%");
    expect(tip.textContent).toContain(new Date(2026, 0, 5).toLocaleDateString());
    expect(tip.textContent).toContain(new Date(2026, 0, 9).toLocaleDateString());
  });
});
