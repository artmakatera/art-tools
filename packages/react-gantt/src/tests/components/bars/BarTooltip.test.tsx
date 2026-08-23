import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Gantt } from "../../../Gantt";
import { GanttBarTooltip } from "../../../components/bars/common/BarTooltip";
import type { BarTooltipProps } from "../../../components/bars/common/BarTooltip";
import type { GanttTask } from "../../../types";

const DELAY = 500;

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
 * order. The tooltip triggers on the `bar`; the `row` still drives the connector
 * handles.
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

/** Nothing renders synchronously any more — the tooltip waits out its dwell. */
function waitOutDelay() {
  act(() => {
    vi.advanceTimersByTime(DELAY);
  });
}

/**
 * The tooltip reads the pointer from a `mousemove` listener it registers on
 * mount, so a move dispatched *before* the hover is invisible to it — which is
 * exactly the real ordering, since `mousemove` follows `mouseover`.
 */
function pointTo(x: number, y: number) {
  fireEvent.mouseMove(document, { clientX: x, clientY: y });
}

/**
 * Queried from `document.body`, not from the render container: the tooltip is
 * portalled there so it can escape the row's stacking context, which puts it
 * outside `container` by design.
 */
function tooltipOf(_container?: HTMLElement) {
  return document.body.querySelector('[role="tooltip"]') as HTMLElement | null;
}

/** jsdom gives every element a zero rect; the placement tests need real numbers. */
function stubTooltipSize(width: number, height: number) {
  const original = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    if (this.getAttribute("role") === "tooltip") {
      return {
        width,
        height,
        top: 0,
        left: 0,
        right: width,
        bottom: height,
        x: 0,
        y: 0,
      } as DOMRect;
    }
    return original.call(this);
  };
  return () => {
    HTMLElement.prototype.getBoundingClientRect = original;
  };
}

describe("bar tooltip slot", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing and keeps the native title when no slot is configured", () => {
    const { container, queryByTestId } = render(<Gantt tasks={makeTasks()} height={400} />);
    const { bar } = barAndRow(container);
    waitOutDelay();

    expect(queryByTestId("probe")).toBeNull();
    expect(tooltipOf(container)).toBeNull();
    expect(bar.getAttribute("title")).toBe("Write the spec");
  });

  it("waits out the dwell delay before the built-in tooltip appears", () => {
    const { container } = render(
      <Gantt
        tasks={makeTasks()}
        height={400}
        bars={{ tooltip: { slots: { tooltip: GanttBarTooltip } } }}
      />,
    );
    fireEvent.mouseEnter(barAndRow(container).bar);

    act(() => {
      vi.advanceTimersByTime(DELAY - 1);
    });
    expect(tooltipOf(container)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(tooltipOf(container)).not.toBeNull();
  });

  it("never appears when the pointer leaves before the delay elapses", () => {
    const { container } = render(
      <Gantt
        tasks={makeTasks()}
        height={400}
        bars={{ tooltip: { slots: { tooltip: GanttBarTooltip } } }}
      />,
    );
    const { bar } = barAndRow(container);

    fireEvent.mouseEnter(bar);
    act(() => {
      vi.advanceTimersByTime(DELAY - 50);
    });
    fireEvent.mouseLeave(bar);
    waitOutDelay();

    expect(tooltipOf(container)).toBeNull();
  });

  it("renders no tooltip when slots.root is replaced — the accepted cost", () => {
    // The tooltip is rendered by DraggableBar, which is only the *default* root,
    // so a custom root that ignores the `tooltip` prop shows nothing (ADR-022).
    // Pinned so the trade-off is visible rather than discovered.
    const CustomRoot = (props: { className?: string; children?: React.ReactNode }) => (
      <div data-testid="custom-root" className={props.className}>
        {props.children}
      </div>
    );
    const { Probe } = makeProbe();
    const { getByTestId, queryByTestId } = render(
      <Gantt
        tasks={makeTasks()}
        height={400}
        bars={{
          taskBar: { slots: { root: CustomRoot } },
          tooltip: { slots: { tooltip: Probe } },
        }}
      />,
    );

    fireEvent.mouseEnter(getByTestId("custom-root"));
    waitOutDelay();
    expect(queryByTestId("probe")).toBeNull();
  });

  it("does not trigger from the row, only from the bar", () => {
    const { Probe } = makeProbe();
    const { container, queryByTestId } = render(
      <Gantt tasks={makeTasks()} height={400} bars={{ tooltip: { slots: { tooltip: Probe } } }} />,
    );
    const { bar, row } = barAndRow(container);

    // The row spans the whole timeline width, so hovering it means hovering
    // empty space that may be months away from the task.
    fireEvent.mouseEnter(row);
    waitOutDelay();
    expect(queryByTestId("probe")).toBeNull();

    fireEvent.mouseEnter(bar);
    waitOutDelay();
    expect(queryByTestId("probe")).not.toBeNull();
  });

  it("unmounts the slot on mouse leave", () => {
    const { Probe } = makeProbe();
    const { container, queryByTestId } = render(
      <Gantt tasks={makeTasks()} height={400} bars={{ tooltip: { slots: { tooltip: Probe } } }} />,
    );
    const { bar } = barAndRow(container);

    fireEvent.mouseEnter(bar);
    waitOutDelay();
    expect(queryByTestId("probe")).not.toBeNull();

    fireEvent.mouseLeave(bar);
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

  it("hands the slot the task, resolved progress, displayEnd and the bar ref", () => {
    const { seen, Probe } = makeProbe();
    const { container } = render(
      <Gantt tasks={makeTasks()} height={400} bars={{ tooltip: { slots: { tooltip: Probe } } }} />,
    );
    const { bar, row } = barAndRow(container);
    fireEvent.mouseEnter(bar);
    waitOutDelay();

    const props = seen.at(-1)!;
    expect(props.task.id).toBe("t0");
    expect(props.progress).toBe(40);
    expect(props.open).toBe(true);
    // Stored end is the exclusive instant Jan 10; the inclusive date is Jan 9 (ADR-014).
    expect(props.displayEnd?.getDate()).toBe(9);
    expect(props.anchorRef.current).toBe(bar);
    expect(props.anchorRef.current).not.toBe(row);
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
    fireEvent.mouseEnter(barAndRow(container).bar);
    waitOutDelay();
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
            slotProps: { tooltip: { className: "my-tip" } },
          },
        }}
      />,
    );
    fireEvent.mouseEnter(barAndRow(container).bar);
    waitOutDelay();

    const tip = tooltipOf(container)!;
    expect(tip.className).toMatch(/my-tip/);
    expect(tip.className).toMatch(/tooltip/); // internal default class survives
  });

  it("GanttBarTooltip renders the name, dates and rounded progress", () => {
    const { container } = render(
      <Gantt
        tasks={makeTasks()}
        height={400}
        bars={{ tooltip: { slots: { tooltip: GanttBarTooltip } } }}
      />,
    );
    fireEvent.mouseEnter(barAndRow(container).bar);
    waitOutDelay();

    // Scoped to the tooltip: the name and the dates also appear in the task list.
    const tip = tooltipOf(container)!;
    expect(tip.textContent).toContain("Write the spec");
    expect(tip.textContent).toContain("40%");
    expect(tip.textContent).toContain(new Date(2026, 0, 5).toLocaleDateString());
    expect(tip.textContent).toContain(new Date(2026, 0, 9).toLocaleDateString());
  });
});

describe("bar tooltip placement", () => {
  const W = 150;
  const H = 90;
  let restoreSize: (() => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    window.innerWidth = 1024;
    window.innerHeight = 768;
    restoreSize = stubTooltipSize(W, H);
  });

  afterEach(() => {
    restoreSize?.();
    restoreSize = undefined;
    vi.useRealTimers();
  });

  function openAt(x: number, y: number) {
    const view = render(
      <Gantt
        tasks={makeTasks()}
        height={400}
        bars={{ tooltip: { slots: { tooltip: GanttBarTooltip } } }}
      />,
    );
    // Enter first: the module-level pointer listener starts on the first tooltip
    // mount, so a move dispatched before that is never seen. Mirrors the real
    // constraint rather than working around it.
    fireEvent.mouseEnter(barAndRow(view.container).bar);
    pointTo(x, y);
    waitOutDelay();
    const tip = tooltipOf(view.container)!;
    return { tip, left: parseFloat(tip.style.left), top: parseFloat(tip.style.top) };
  }

  it("sits below-right of the cursor by default", () => {
    const { left, top } = openAt(400, 400);
    expect(left).toBeGreaterThan(400);
    expect(top).toBeGreaterThan(400);
  });

  it("flips to the left of the cursor near the right edge", () => {
    // 1000 + offset + 150 overflows 1024, so it must flip.
    const { left } = openAt(1000, 400);
    expect(left).toBeLessThan(1000);
    expect(left + W).toBeLessThanOrEqual(1024);
  });

  it("flips above the cursor near the bottom edge", () => {
    const { top } = openAt(400, 740);
    expect(top).toBeLessThan(740);
    expect(top + H).toBeLessThanOrEqual(768);
  });

  it("stays inside the viewport with the cursor in the bottom-right corner", () => {
    const { left, top } = openAt(1020, 760);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(left + W).toBeLessThanOrEqual(1024);
    expect(top + H).toBeLessThanOrEqual(768);
  });

  it("follows the pointer during the dwell, then uses where it ended up", () => {
    const view = render(
      <Gantt
        tasks={makeTasks()}
        height={400}
        bars={{ tooltip: { slots: { tooltip: GanttBarTooltip } } }}
      />,
    );
    // Enter, drift to 200, then to 600 before the delay fires: the tooltip should
    // appear next to 600, the last position seen.
    fireEvent.mouseEnter(barAndRow(view.container).bar);
    pointTo(200, 300);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    pointTo(600, 300);
    act(() => {
      vi.advanceTimersByTime(DELAY);
    });

    const left = parseFloat(tooltipOf(view.container)!.style.left);
    expect(left).toBeGreaterThan(600);
    expect(left).toBeLessThan(700);
  });

  it("does not reposition once shown — placement is frozen", () => {
    const { tip, left, top } = openAt(400, 400);

    pointTo(700, 500);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(parseFloat(tip.style.left)).toBe(left);
    expect(parseFloat(tip.style.top)).toBe(top);
  });
});
