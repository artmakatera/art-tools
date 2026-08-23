import { fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Gantt } from "../../../Gantt";
import {
  BarTooltipRoot,
  BarTooltipTrigger,
  GanttBarTooltip,
  useBarTooltip,
} from "../../../components/bars/barTooltip";
import type { BarTooltipProps } from "../../../components/bars/barTooltip";
import { TaskBar } from "../../../components/bars/taskBar/TaskBar";
import { GanttSlotsProvider } from "../../../context/GanttSlotsContext";
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

/** Matches `GanttBarTooltip`'s own formatting, so the test is locale-agnostic. */
function formatted(date: Date) {
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Scoped by the bar's public hook class, not by `[role="gridcell"]` — the task
 * list is a treegrid whose cells match that role and come first in document
 * order. The tooltip opens from the `bar`; the `row` drives the connector handles.
 */
function barAndRow(container: HTMLElement) {
  const bar = container.querySelector(".am-gantt-bar-task") as HTMLElement;
  return { bar, row: bar.parentElement as HTMLElement };
}

/** Reads the open state out of the enclosing root — a slot has no `open` prop. */
function Marker({ name }: { name: string }) {
  return useBarTooltip()?.open ? <div data-testid="probe">{name}</div> : null;
}

/**
 * Records the props the slot was called with, so we can assert on them.
 *
 * Built the way a custom tooltip is meant to be: own the open state with
 * `BarTooltipRoot`, wrap `children` in the trigger, and read `open` from context.
 */
function makeProbe() {
  const seen: BarTooltipProps[] = [];
  const Probe = (props: BarTooltipProps) => {
    seen.push(props);
    return (
      <BarTooltipRoot anchorRef={props.anchorRef}>
        <BarTooltipTrigger>{props.children}</BarTooltipTrigger>
        <Marker name={props.task.name} />
      </BarTooltipRoot>
    );
  };
  return { seen, Probe };
}

/**
 * Queried from `document.body`, not from the render container: the tooltip is
 * portalled there to escape the row's stacking context, which puts it outside
 * `container` by design.
 */
function tooltipEl() {
  return document.body.querySelector('[role="tooltip"]') as HTMLElement | null;
}

function pointTo(x: number, y: number) {
  fireEvent.mouseMove(document, { clientX: x, clientY: y });
}

/**
 * jsdom reports every rect as zero, and both the placement clamp and the
 * pointer-outside guard deliberately ignore zero-size rects as "not laid out".
 * Tests that need either to engage have to supply real numbers.
 */
function stubRects(match: (el: HTMLElement) => boolean, rect: Partial<DOMRect>) {
  const original = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    if (match(this)) {
      return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, ...rect } as DOMRect;
    }
    return original.call(this);
  };
  return () => {
    HTMLElement.prototype.getBoundingClientRect = original;
  };
}

const isTooltip = (el: HTMLElement) => el.getAttribute("role") === "tooltip";
const isBar = (el: HTMLElement) => el.classList.contains("am-gantt-bar-task");

function renderChart(slot: BarTooltipProps extends never ? never : unknown = GanttBarTooltip) {
  return render(
    <Gantt
      tasks={makeTasks()}
      height={400}
      bars={{ tooltip: { slots: { tooltip: slot as never } } }}
    />,
  );
}

describe("bar tooltip slot", () => {
  it("renders nothing and keeps the native title when no slot is configured", () => {
    const { container } = render(<Gantt tasks={makeTasks()} height={400} />);
    const { bar } = barAndRow(container);

    fireEvent.mouseEnter(bar);
    expect(tooltipEl()).toBeNull();
    expect(bar.getAttribute("title")).toBe("Write the spec");
  });

  it("opens on bar hover with no dwell delay", () => {
    const { container } = renderChart();
    fireEvent.mouseEnter(barAndRow(container).bar);
    expect(tooltipEl()).not.toBeNull();
  });

  it("does not open from the row, only from the bar", () => {
    const { Probe } = makeProbe();
    const { container, queryByTestId } = renderChart(Probe);
    const { bar, row } = barAndRow(container);

    // A row spans the whole timeline width, so hovering it means hovering empty
    // space that may be months away from the task.
    fireEvent.mouseEnter(row);
    expect(queryByTestId("probe")).toBeNull();

    fireEvent.mouseEnter(bar);
    expect(queryByTestId("probe")).not.toBeNull();
  });

  it("closes on mouse leave", () => {
    const { container } = renderChart();
    const { bar } = barAndRow(container);

    fireEvent.mouseEnter(bar);
    expect(tooltipEl()).not.toBeNull();

    fireEvent.mouseLeave(bar);
    expect(tooltipEl()).toBeNull();
  });

  it("keeps the same bar node across a hover", () => {
    // The slot wrapping the bar unconditionally is what guarantees this. Mounting
    // it only while open remounted the bar on every hover, which left the pointer
    // over a detached node so `mouseleave` never arrived (ADR-022).
    const { container } = renderChart();
    const { bar } = barAndRow(container);

    fireEvent.mouseEnter(bar);
    expect(barAndRow(container).bar).toBe(bar);
  });

  it("never opens for a slot that omits root and trigger", () => {
    // The cost of the state living in the slot, stated as a test: a slot that
    // renders `children` bare gets no hover behaviour at all, silently.
    const Bare = (props: BarTooltipProps) => (
      <>
        {props.children}
        <Marker name={props.task.name} />
      </>
    );
    const { container, queryByTestId } = renderChart(Bare);

    fireEvent.mouseEnter(barAndRow(container).bar);
    expect(queryByTestId("probe")).toBeNull();
  });

  it("lets a slot bring its own open state, for a third-party tooltip", () => {
    // The reason the chart holds no open state: a slot backed by Base UI, Radix
    // or Floating UI arrives with its own root and trigger, and must not have to
    // reconcile them with ours (ADR-022).
    const ThirdParty = (props: BarTooltipProps) => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <div
            data-testid="foreign-trigger"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
          >
            {props.children}
          </div>
          {open ? <div data-testid="foreign-popup">{props.task.name}</div> : null}
        </>
      );
    };
    const { getByTestId, queryByTestId } = renderChart(ThirdParty);

    fireEvent.mouseEnter(getByTestId("foreign-trigger"));
    expect(queryByTestId("foreign-popup")).not.toBeNull();

    fireEvent.mouseLeave(getByTestId("foreign-trigger"));
    expect(queryByTestId("foreign-popup")).toBeNull();
  });

  it("suppresses the native title once a slot is configured, keeping aria-label", () => {
    const { container } = renderChart();
    const { bar } = barAndRow(container);

    expect(bar.getAttribute("title")).toBeNull();
    expect(bar.getAttribute("aria-label")).toBeTruthy();
  });

  it("hands the slot the task, resolved progress, an inclusive displayEnd and the bar ref", () => {
    const { seen, Probe } = makeProbe();
    const { container } = renderChart(Probe);
    fireEvent.mouseEnter(barAndRow(container).bar);

    const props = seen.at(-1)!;
    expect(props.task.id).toBe("t0");
    expect(props.progress).toBe(40);
    // Stored end is the exclusive instant Jan 10; the inclusive date is Jan 9 (ADR-014).
    expect(props.displayEnd?.getDate()).toBe(9);
    // The ref object is handed over; React populates `.current` after commit, so
    // its value at first render is not what this asserts.
    expect(props.anchorRef).toHaveProperty("current");
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
    expect(queryByTestId("probe")).not.toBeNull();
  });

  it("portals the tooltip out of the chart container", () => {
    const { container } = renderChart();
    fireEvent.mouseEnter(barAndRow(container).bar);

    // Escaping `.row`'s stacking context is the whole reason for the portal, so
    // being outside the container is the behaviour, not an accident (ADR-022).
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
    expect(tooltipEl()).not.toBeNull();
  });

  it("merges slotProps.tooltip className with the internal class", () => {
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

    const tip = tooltipEl()!;
    expect(tip.className).toMatch(/my-tip/);
    expect(tip.className).toMatch(/tooltip/);
  });

  it("renders no tooltip when slots.root is replaced — the accepted cost", () => {
    // The tooltip is rendered by DraggableBar, only the *default* root, so a
    // custom root that ignores the `tooltip` prop shows nothing (ADR-022).
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
        bars={{ taskBar: { slots: { root: CustomRoot } }, tooltip: { slots: { tooltip: Probe } } }}
      />,
    );

    fireEvent.mouseEnter(getByTestId("custom-root"));
    expect(queryByTestId("probe")).toBeNull();
  });

  it("GanttBarTooltip renders the name, both dates and rounded progress", () => {
    const { container } = renderChart();
    fireEvent.mouseEnter(barAndRow(container).bar);

    // Scoped to the tooltip: the name and dates also appear in the task list.
    const tip = tooltipEl()!;
    expect(tip.textContent).toContain("Write the spec");
    expect(tip.textContent).toContain("40%");
    expect(tip.textContent).toContain(formatted(new Date(2026, 0, 5)));
    expect(tip.textContent).toContain(formatted(new Date(2026, 0, 9)));
  });
});

describe("bar tooltip closing guards", () => {
  let restore: (() => void) | undefined;

  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it("closes on scroll, which no pointer check can catch", () => {
    // A stationary cursor during a wheel scroll produces no mousemove at all, so
    // the bar can leave from under the pointer with no `mouseout` (ADR-022).
    const { container } = renderChart();
    fireEvent.mouseEnter(barAndRow(container).bar);
    expect(tooltipEl()).not.toBeNull();

    fireEvent.scroll(document);
    expect(tooltipEl()).toBeNull();
  });

  it("closes when a pointer move lands outside the bar", () => {
    restore = stubRects(isBar, {
      left: 100,
      top: 100,
      right: 300,
      bottom: 140,
      width: 200,
      height: 40,
    });
    const { container } = renderChart();
    fireEvent.mouseEnter(barAndRow(container).bar);
    expect(tooltipEl()).not.toBeNull();

    pointTo(200, 120); // inside
    expect(tooltipEl()).not.toBeNull();

    pointTo(600, 500); // outside
    expect(tooltipEl()).toBeNull();
  });

  it("ignores an unmeasured bar rather than closing immediately", () => {
    // Every rect is zero in jsdom, and on a real first paint too. Trusting a
    // zero-size rect would read every pointer position as outside.
    const { container } = renderChart();
    fireEvent.mouseEnter(barAndRow(container).bar);

    pointTo(600, 500);
    expect(tooltipEl()).not.toBeNull();
  });
});

describe("bar tooltip placement", () => {
  const W = 150;
  const H = 90;
  let restore: (() => void) | undefined;

  beforeEach(() => {
    window.innerWidth = 1024;
    window.innerHeight = 768;
    // Only the tooltip is measured, so the bar stays "unmeasured" and the
    // pointer-outside guard stays out of the way while the cursor moves.
    restore = stubRects(isTooltip, { width: W, height: H, right: W, bottom: H });
  });

  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  function openAt(x: number, y: number) {
    const { container } = renderChart();
    fireEvent.mouseEnter(barAndRow(container).bar);
    pointTo(x, y);
    const tip = tooltipEl()!;
    return { left: parseFloat(tip.style.left), top: parseFloat(tip.style.top) };
  }

  it("sits below-right of the cursor by default", () => {
    const { left, top } = openAt(400, 400);
    expect(left).toBeGreaterThan(400);
    expect(top).toBeGreaterThan(400);
  });

  it("flips to the left of the cursor rather than clamping through it", () => {
    // Clamping to the far edge would drag the tooltip back *under* the pointer.
    const { left } = openAt(1000, 400);
    expect(left + W).toBeLessThanOrEqual(1000);
  });

  it("flips above the cursor near the bottom edge", () => {
    const { top } = openAt(400, 740);
    expect(top + H).toBeLessThanOrEqual(740);
  });

  it("stays inside the bounds with the cursor in the corner", () => {
    const { left, top } = openAt(1020, 760);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(left + W).toBeLessThanOrEqual(1024);
    expect(top + H).toBeLessThanOrEqual(768);
  });

  it("stops tracking once the pointer is outside the bounds", () => {
    const { container } = renderChart();
    fireEvent.mouseEnter(barAndRow(container).bar);

    pointTo(400, 400);
    const settled = tooltipEl()!.style.left;

    // Past the viewport edge there is nothing to place against, so the position
    // is left alone rather than recomputed for a pointer off the chart.
    pointTo(5000, 400);
    expect(tooltipEl()!.style.left).toBe(settled);
  });
});

describe("bar tooltip without a GanttProvider", () => {
  /**
   * `GanttSlotsProvider` and the three bar components are all public exports, so
   * this composition is supported and must not throw — the same reason
   * `useBarTooltip` returns null instead of erroring (ADR-022).
   *
   * It is also the case a hot reload produces: re-evaluating `contexts.ts` mints
   * a new context object that the mounted provider is not providing, so an
   * asserting `useGanttScroll()` crashed the popup on every HMR update.
   */
  it("opens on a standalone bar with no chart around it", () => {
    const task = makeTasks()[0];
    const progress = task.progress ?? 0;

    render(
      <GanttSlotsProvider value={{ bars: { tooltip: { slots: { tooltip: GanttBarTooltip } } } }}>
        <TaskBar
          width={120}
          height={24}
          left={0}
          top={0}
          colWidth={30}
          title={task.name}
          progress={progress}
          tooltip={{ task, progress, displayEnd: new Date(2026, 0, 9) }}
        />
      </GanttSlotsProvider>,
    );

    const bar = document.body.querySelector(".am-gantt-bar-task") as HTMLElement;
    fireEvent.mouseEnter(bar);

    expect(tooltipEl()).not.toBeNull();
    expect(tooltipEl()!.textContent).toContain("Write the spec");
  });

  it("falls back to the viewport when there is no grid to clamp against", () => {
    const task = makeTasks()[0];
    const restore = stubRects(isTooltip, { width: 120, height: 60 });

    try {
      render(
        <GanttSlotsProvider value={{ bars: { tooltip: { slots: { tooltip: GanttBarTooltip } } } }}>
          <TaskBar
            width={120}
            height={24}
            left={0}
            top={0}
            colWidth={30}
            title={task.name}
            progress={0}
            tooltip={{ task, progress: 0, displayEnd: new Date(2026, 0, 9) }}
          />
        </GanttSlotsProvider>,
      );

      const bar = document.body.querySelector(".am-gantt-bar-task") as HTMLElement;
      fireEvent.mouseEnter(bar);
      pointTo(1000, 400);

      // Clamped to jsdom's 1024x768 window, not to a grid rect there is none of.
      expect(Number.parseInt(tooltipEl()!.style.left, 10) + 120).toBeLessThanOrEqual(1024);
    } finally {
      restore();
    }
  });
});
