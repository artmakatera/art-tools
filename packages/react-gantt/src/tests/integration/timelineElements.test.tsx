import { TimelineElements } from "../../components/timelineElements/TimelineElements";
import { useMemo, useState } from "react";
import overlayCss from "../../components/timelineElements/TimelineElements.module.css?inline";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Gantt,
  GanttGrid,
  GanttProvider,
  Marker,
  type GanttTimelineElement,
  type TimelineElementRenderProps,
  type GanttTask,
} from "../../index";
import { GanttViewportContext } from "../../context/contexts";

const renderMarker = (props: TimelineElementRenderProps) => <Marker {...props} />;

const date = (day: number) => new Date(2026, 0, day);
const tasks: GanttTask[] = [{ id: "task", name: "Task", startDate: date(1), endDate: date(30) }];
const viewport = { scrollLeft: 0, scrollTop: 0, clientWidth: 200, clientHeight: 300 };
function Chart({
  elements,
  scrollLeft = 0,
  scrollTop = 0,
}: {
  elements: GanttTimelineElement[];
  scrollLeft?: number;
  scrollTop?: number;
}) {
  const metrics = useMemo(() => ({ ...viewport, scrollLeft, scrollTop }), [scrollLeft, scrollTop]);
  return (
    <GanttProvider
      tasks={Array.from({ length: 4 }, (_, i) => ({ ...tasks[0]!, id: i }))}
      padDays={0}
      colWidth={40}
      timelineElements={elements}
    >
      <GanttViewportContext.Provider value={metrics}>
        <GanttGrid />
      </GanttViewportContext.Provider>
    </GanttProvider>
  );
}

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button style={{ pointerEvents: "auto" }} onClick={() => setCount(count + 1)}>
      Count {count}
    </button>
  );
}

describe("timeline overlays", () => {
  it("never falls back to a Marker when a JavaScript caller omits render", () => {
    // @ts-expect-error A renderer is required in the public API.
    const element: GanttTimelineElement = { key: "missing", date: date(2), title: "No fallback" };
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { container, queryByText } = render(<Chart elements={[element]} />);
      expect(queryByText("No fallback")).toBeNull();
      expect(container.querySelector(".marker")).toBeNull();
      expect(warning).toHaveBeenCalled();
    } finally {
      warning.mockRestore();
    }
  });
  it("accepts direct Marker customization and overrides the supplied title", () => {
    const { getByText } = render(
      <Chart
        elements={[
          {
            key: "explicit",
            date: date(2),
            title: "Element title",
            render: (props) => (
              <Marker
                {...props}
                title="Explicit title"
                style={{ color: "blue" }}
                slotProps={{
                  root: { style: { background: "blue" } },
                  label: { style: { background: "blue" } },
                }}
              />
            ),
          },
        ]}
      />,
    );
    const label = getByText("Explicit title");
    expect(label.style.background).toBe("blue");
    expect(label.parentElement?.style.color).toBe("blue");
    expect(label.parentElement?.style.background).toBe("blue");
    expect(label.parentElement?.hasAttribute("bodyHeight")).toBe(false);
  });
  it("renders no overlay and needs no viewport provider when elements are absent", () => {
    const { container } = render(
      <TimelineElements
        origin={date(1)}
        unit="day"
        step={1}
        colWidth={40}
        totalWidth={400}
        bodyHeight={36}
        headerHeight={74}
      />,
    );
    expect(container.childElementCount).toBe(0);
  });
  it("resets custom local state only after virtualized unmount", () => {
    const elements = [{ key: "counter", date: date(2), render: () => <Counter /> }];
    const { getByRole, queryByRole, rerender } = render(<Chart elements={elements} />);
    fireEvent.click(getByRole("button", { name: "Count 0" }));
    rerender(<Chart elements={elements} scrollTop={10} />);
    expect(getByRole("button", { name: "Count 1" })).not.toBeNull();
    rerender(<Chart elements={elements} scrollLeft={600} />);
    expect(queryByRole("button", { name: /Count/ })).toBeNull();
    rerender(<Chart elements={elements} />);
    expect(getByRole("button", { name: "Count 0" })).not.toBeNull();
  });
  it("uses column steps when scales change and repositions an updated date", () => {
    const element = { render: renderMarker, key: "scale", date: date(3), title: "Scale marker" };
    const scales = [{ unit: "day" as const, step: 2, format: (d: Date) => String(d.getDate()) }];
    const { getByText, rerender } = render(
      <Gantt
        tasks={tasks}
        padDays={0}
        colWidth={80}
        scales={scales}
        timelineElements={[element]}
      />,
    );
    const position = () => getByText("Scale marker").parentElement?.parentElement?.style.left;
    expect(position()).toBe("80px");
    rerender(
      <Gantt
        tasks={tasks}
        padDays={0}
        colWidth={80}
        scales={scales}
        timelineElements={[{ ...element, date: date(4) }]}
      />,
    );
    expect(position()).toBe("120px");
  });
  it("keeps marker lines transparent to pointer hit testing while tasks can be edited", () => {
    // jsdom cannot hit-test overlapping elements: verify stylesheet pointer
    // policy separately, then exercise the underlying task's edit transaction.
    const style = document.createElement("style");
    style.textContent = overlayCss;
    document.head.append(style);
    try {
      const change = vi.fn();
      const { container } = render(
        <Gantt
          tasks={[{ ...tasks[0]!, progress: 40 }]}
          padDays={0}
          timelineElements={[
            { render: renderMarker, key: "pointer", date: date(2), title: "Pointer marker" },
          ]}
          onTasksChange={change}
        />,
      );
      const line = container.querySelector<HTMLElement>(".marker .line")!;
      const label = container.querySelector<HTMLElement>(".marker .label")!;
      expect(getComputedStyle(line).pointerEvents).toBe("none");
      expect(getComputedStyle(line.parentElement!.parentElement!).pointerEvents).toBe("none");
      expect(getComputedStyle(label).pointerEvents).toBe("auto");
      const bar = container.querySelector<HTMLElement>(".am-gantt-bar-task")!;
      const width = Number.parseFloat(bar.style.width);
      fireEvent.mouseDown(bar.querySelector(".barProgressResizeHandle")!, { clientX: 100 });
      fireEvent.mouseMove(window, { clientX: 100 + width * 0.2 });
      fireEvent.mouseUp(window);
      expect(change).toHaveBeenCalled();
      expect(line.parentElement?.parentElement?.style.left).toBe("40px");
    } finally {
      style.remove();
    }
  });
  it("renders from the standalone provider and keeps the label below the calendar", () => {
    const { getByText, rerender } = render(
      <Chart
        elements={[{ render: renderMarker, key: "start", date: date(2), title: "Project start" }]}
      />,
    );
    const label = getByText("Project start");
    expect(label.parentElement?.parentElement?.style.left).toBe("40px");
    rerender(
      <Chart
        scrollTop={90}
        elements={[{ render: renderMarker, key: "start", date: date(2), title: "Project start" }]}
      />,
    );
    expect(getByText("Project start").style.top).toBe("90px");
  });
  it("unmounts offscreen custom components and passes date and geometry", () => {
    const callback = vi.fn((_context: import("../../types").TimelineElementRenderProps) => (
      <button style={{ pointerEvents: "auto" }}>Custom</button>
    ));
    const elements = [{ key: "custom", date: date(20), render: callback }];
    const { queryByText, rerender } = render(<Chart elements={elements} />);
    expect(queryByText("Custom")).toBeNull();
    expect(callback).not.toHaveBeenCalled();
    rerender(<Chart elements={elements} scrollLeft={600} scrollTop={50} />);
    expect(queryByText("Custom")).not.toBeNull();
    expect(callback.mock.calls[0]?.[0]).not.toHaveProperty("key");
    expect(callback.mock.calls[0]?.[0]).not.toHaveProperty("props");
    expect(callback.mock.calls[0]?.[0]).toMatchObject({
      x: 760,
      bodyHeight: 144,
      visibleTop: 50,
      date: date(20),
    });
    rerender(<Chart elements={elements} />);
    expect(queryByText("Custom")).toBeNull();
  });
  it("supports custom click handlers and null render results", () => {
    const click = vi.fn();
    const { getByRole, queryByText } = render(
      <Chart
        elements={[
          {
            key: "custom",
            date: date(2),
            render: () => (
              <button onClick={click} style={{ pointerEvents: "auto" }}>
                Open
              </button>
            ),
          },
          { key: "hidden", date: date(2), title: "Hidden", render: () => null },
        ]}
      />,
    );
    fireEvent.click(getByRole("button", { name: "Open" }));
    expect(click).toHaveBeenCalledOnce();
    expect(queryByText("Hidden")).toBeNull();
  });
  it("keeps axis geometry unchanged and supports date updates and empty input", () => {
    const { container, queryByText, rerender } = render(
      <Gantt
        padDays={0}
        tasks={tasks}
        timelineElements={[{ render: renderMarker, key: "out", date: date(100), title: "Outside" }]}
      />,
    );
    const width = container.querySelector<HTMLElement>(".grid")?.style.width;
    expect(queryByText("Outside")).toBeNull();
    rerender(
      <Gantt
        padDays={0}
        tasks={tasks}
        timelineElements={[{ render: renderMarker, key: "out", date: date(2), title: "Inside" }]}
      />,
    );
    expect(queryByText("Inside")).not.toBeNull();
    expect(container.querySelector<HTMLElement>(".grid")?.style.width).toBe(width);
    rerender(<Gantt padDays={0} tasks={tasks} timelineElements={[]} />);
    expect(queryByText("Inside")).toBeNull();
    expect(container.querySelector(".marker")).toBeNull();
    rerender(
      <Gantt
        padDays={0}
        tasks={[]}
        timelineElements={[{ render: renderMarker, key: "out", date: date(2), title: "Empty" }]}
      />,
    );
    expect(queryByText("Empty")).toBeNull();
  });
  it("merges global slots with direct Marker props winning", () => {
    const { getByText } = render(
      <Gantt
        padDays={0}
        tasks={tasks}
        timeline={{
          marker: {
            slotProps: {
              label: { style: { color: "red" }, className: "global-label" },
              root: { className: "global-root" },
            },
          },
        }}
        timelineElements={[
          {
            key: "m",
            date: date(2),
            title: "Project start",
            render: (props) => (
              <Marker
                {...props}
                className="individual-root"
                formatDate={() => "Custom date"}
                slotProps={{ label: { style: { color: "blue" }, className: "individual-label" } }}
              />
            ),
          },
        ]}
      />,
    );
    const label = getByText("Project start");
    expect(label.style.color).toBe("blue");
    expect(label.className).toContain("global-label");
    expect(label.className).toContain("individual-label");
    expect(label.title).toBe("Custom date");
    expect(label.parentElement?.className).toContain("global-root");
    expect(label.parentElement?.className).toContain("individual-root");
  });
  it("renders a line without a label and spans baseline strips", () => {
    const { container } = render(
      <Gantt
        padDays={0}
        tasks={[{ ...tasks[0]!, baselines: [{ id: "b", startDate: date(1), endDate: date(3) }] }]}
        timelineElements={[{ render: renderMarker, key: "m", date: date(2) }]}
      />,
    );
    expect(container.querySelector(".marker .label")).toBeNull();
    expect(container.querySelector(".marker .line")).not.toBeNull();
    expect(container.querySelector<HTMLElement>('[role="grid"] .body')?.style.height).toBe("42px");
  });
  it("allows a custom slot component and direct Marker composition", () => {
    const { getByText } = render(
      <Marker
        date={date(1)}
        x={0}
        bodyHeight={36}
        visibleTop={0}
        visibleHeight={36}
        title="Standalone"
        slots={{ label: "strong" }}
      />,
    );
    expect(getByText("Standalone").tagName).toBe("STRONG");
  });
});
