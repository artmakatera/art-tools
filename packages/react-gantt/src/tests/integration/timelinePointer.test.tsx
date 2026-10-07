import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Gantt,
  GanttProvider,
  GanttGrid,
  Marker,
  type GanttTimelineElement,
  type TimelineElementRenderProps,
} from "../../index";
import overlayCss from "../../components/timelineElements/TimelineElements.module.css?inline";

const date = (day: number, hour = 0) => new Date(2026, 0, day, hour);
const tasks = Array.from({ length: 20 }, (_, id) => ({
  id,
  name: `Task ${id}`,
  startDate: date(1),
  endDate: date(30),
}));
const scales = [
  { unit: "day" as const, step: 1, format: (value: Date) => String(value.getDate()) },
];
const frames = new Map<number, FrameRequestCallback>();
let frameId = 0;

function flushFrames() {
  act(() => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(0));
  });
}

function geometry(container: HTMLElement) {
  const grid = container.querySelector<HTMLElement>('[role="grid"]')!;
  const body = grid.querySelector<HTMLElement>(".body")!;
  Object.defineProperties(grid, {
    clientWidth: { configurable: true, value: 200 },
    clientHeight: { configurable: true, value: 300 },
  });
  vi.spyOn(grid, "getBoundingClientRect").mockImplementation(
    () => ({ left: 100, top: 100, right: 300, bottom: 400, width: 200, height: 300 }) as DOMRect,
  );
  vi.spyOn(body, "getBoundingClientRect").mockImplementation(
    () =>
      ({
        left: 100 - grid.scrollLeft,
        top: 138 - grid.scrollTop,
        bottom: 858 - grid.scrollTop,
        width: 1160,
        height: 720,
      }) as DOMRect,
  );
  return { grid, body };
}

function renderMarker(props: TimelineElementRenderProps) {
  return <Marker {...props} title={props.date.toISOString()} />;
}

beforeEach(() => {
  frames.clear();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("pointer timeline elements", () => {
  it("shows the exact date on entry, follows horizontally and hides on leave or blur", () => {
    const callback = vi.fn(renderMarker);
    const elements: GanttTimelineElement[] = [
      { key: "pointer", date: "pointer", render: callback },
    ];
    const { container, queryByText, getByText } = render(
      <Gantt tasks={tasks} scales={scales} padDays={0} colWidth={40} timelineElements={elements} />,
    );
    const { body } = geometry(container);
    expect(callback).not.toHaveBeenCalled();
    fireEvent.mouseEnter(body, { clientX: 160, clientY: 200 });
    flushFrames();
    expect(getByText(date(2, 12).toISOString())).toBeInTheDocument();
    expect(callback.mock.lastCall?.[0]).toMatchObject({ x: 60, date: date(2, 12) });
    fireEvent.mouseMove(body, { clientX: 180, clientY: 230 });
    flushFrames();
    expect(getByText(date(3).toISOString()).parentElement?.parentElement?.style.left).toBe("80px");
    fireEvent.mouseLeave(body);
    expect(queryByText(date(3).toISOString())).toBeNull();
    fireEvent.mouseMove(body, { clientX: 180, clientY: 230 });
    flushFrames();
    fireEvent.blur(window);
    expect(queryByText(date(3).toISOString())).toBeNull();
  });

  it("updates under a stationary mouse on scroll and resolves multi-unit zoom", () => {
    const elements: GanttTimelineElement[] = [
      { key: "pointer", date: "pointer", render: renderMarker },
    ];
    const { container, getByText, rerender } = render(
      <Gantt tasks={tasks} scales={scales} padDays={0} colWidth={40} timelineElements={elements} />,
    );
    const { grid, body } = geometry(container);
    fireEvent.mouseMove(body, { clientX: 160, clientY: 200 });
    flushFrames();
    grid.scrollLeft = 80;
    grid.scrollTop = 100;
    fireEvent.scroll(grid);
    flushFrames();
    const label = getByText(date(4, 12).toISOString());
    expect(label.style.top).toBe("100px");
    expect(label.parentElement?.parentElement?.style.left).toBe("140px");
    rerender(
      <Gantt
        tasks={tasks}
        scales={[{ ...scales[0]!, step: 2 }]}
        padDays={0}
        colWidth={40}
        timelineElements={elements}
      />,
    );
    expect(getByText(date(8).toISOString())).toBeInTheDocument();
  });

  it("supports the standalone provider and fractional month dates", () => {
    const callback = vi.fn(renderMarker);
    const { container, getByText } = render(
      <GanttProvider
        tasks={[{ ...tasks[0]!, endDate: new Date(2026, 3, 1) }]}
        scales={[{ unit: "month", step: 1, format: (value) => String(value.getMonth()) }]}
        padDays={0}
        colWidth={40}
        timelineElements={[{ key: "pointer", date: "pointer", render: callback }]}
      >
        <GanttGrid />
      </GanttProvider>,
    );
    const { body } = geometry(container);
    fireEvent.mouseMove(body, { clientX: 160, clientY: 200 });
    flushFrames();
    const midpoint = new Date(2026, 1, 15);
    expect(getByText(midpoint.toISOString())).toBeInTheDocument();
    expect(callback.mock.lastCall?.[0]).toMatchObject({ x: 60, date: midpoint });
  });

  it("excludes calendar, scrollbar and out-of-body positions", () => {
    const callback = vi.fn(renderMarker);
    const { container } = render(
      <Gantt
        tasks={tasks}
        scales={scales}
        padDays={0}
        timelineElements={[{ key: "pointer", date: "pointer", render: callback }]}
      />,
    );
    const { body } = geometry(container);
    for (const [clientX, clientY] of [
      [160, 120],
      [300, 200],
      [99, 200],
      [160, 400],
    ]) {
      fireEvent.mouseMove(body, { clientX, clientY });
      flushFrames();
    }
    expect(callback).not.toHaveBeenCalled();
  });

  it("coalesces moves and cancels queued updates when leaving or removing the entry", () => {
    const callback = vi.fn(renderMarker);
    const { container, rerender } = render(
      <Gantt
        tasks={tasks}
        scales={scales}
        padDays={0}
        colWidth={40}
        timelineElements={[{ key: "pointer", date: "pointer", render: callback }]}
      />,
    );
    const { body } = geometry(container);
    fireEvent.mouseMove(body, { clientX: 140, clientY: 200 });
    fireEvent.mouseMove(body, { clientX: 180, clientY: 200 });
    expect(frames.size).toBe(1);
    flushFrames();
    expect(callback.mock.calls.every(([props]) => props.x === 80)).toBe(true);
    expect(callback.mock.lastCall?.[0].date).toEqual(date(3));
    callback.mockClear();
    fireEvent.mouseMove(body, { clientX: 200, clientY: 200 });
    fireEvent.mouseLeave(body);
    flushFrames();
    expect(callback).not.toHaveBeenCalled();
    fireEvent.mouseMove(body, { clientX: 200, clientY: 200 });
    rerender(<Gantt tasks={tasks} scales={scales} timelineElements={[]} />);
    flushFrames();
    expect(callback).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });

  it("keeps pointer labels transparent to hit testing alongside fixed markers", () => {
    const style = document.createElement("style");
    style.textContent = overlayCss;
    document.head.append(style);
    try {
      const { container, getByText } = render(
        <Gantt
          tasks={tasks}
          scales={scales}
          padDays={0}
          colWidth={40}
          timelineElements={[
            {
              key: "fixed",
              date: date(2),
              title: "Fixed",
              render: (props) => <Marker {...props} />,
            },
            { key: "pointer", date: "pointer", render: renderMarker },
          ]}
        />,
      );
      const { body } = geometry(container);
      fireEvent.mouseMove(body, { clientX: 180, clientY: 200 });
      flushFrames();
      expect(getComputedStyle(getByText(date(3).toISOString())).pointerEvents).toBe("none");
      expect(getComputedStyle(getByText("Fixed")).pointerEvents).toBe("auto");
    } finally {
      style.remove();
    }
  });
});
