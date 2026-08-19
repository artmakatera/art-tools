import { act, fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  GanttProvider,
  useGanttConfig,
  useGanttDependency,
  useGanttDependencyDrag,
  useGanttDragActive,
  useGanttLabels,
  useGanttReadOnly,
  useGanttScroll,
  useGanttSelectedId,
  useGanttTaskActions,
  useGanttTaskState,
  useGanttViewport,
  useGanttWorkCalendar,
  useGanttZoom,
} from "../../context/GanttContext";
import type { GanttCalendar, GanttTask } from "../../types";

/**
 * The re-render cadence of the split contexts, as an executable contract.
 *
 * `GanttContext.tsx` splits state across 12 contexts "by update frequency so
 * high-frequency state never invalidates consumers that only need stable
 * references", and documents the intended cadence as a comment. That comment is
 * the only thing protecting the split today: every context still resolves, and
 * every test still passes, if a value starts churning — the chart just gets
 * slower, silently.
 *
 * These tests pin the vector. One probe per context, each counting its own
 * renders, against each stimulus class. If a refactor merges two contexts or
 * lets a memo churn, the numbers move here first.
 *
 * How the bail-out works, since the numbers depend on it: `children` is an
 * element created once by the test, so when the provider re-renders from its own
 * state the children prop is referentially identical, React bails out on that
 * subtree, and only components reading a *changed* context re-render.
 */

const tasks: GanttTask[] = [
  { id: "1", name: "Parent", startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 20) },
  {
    id: "2",
    name: "Child",
    parentId: "1",
    startDate: new Date(2026, 0, 1),
    endDate: new Date(2026, 0, 10),
  },
  { id: "3", name: "Other", startDate: new Date(2026, 0, 12), endDate: new Date(2026, 0, 18) },
];

type Ctx =
  | "config"
  | "labels"
  | "calendar"
  | "readOnly"
  | "taskState"
  | "taskActions"
  | "selection"
  | "scroll"
  | "viewport"
  | "dependency"
  | "dragActive"
  | "drag";

const counts = new Map<Ctx, number>();
const bump = (name: Ctx): void => {
  counts.set(name, (counts.get(name) ?? 0) + 1);
};

/** Snapshot the counters, then zero them so the next stimulus reads as a delta. */
function takeDeltas(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of counts) {
    out[k] = v;
  }
  counts.clear();
  return out;
}

// --- Probes: exactly one consumer hook each -------------------------------

const ConfigProbe = () => (bump("config"), useGanttConfig(), null);
const LabelsProbe = () => (bump("labels"), useGanttLabels(), null);
const CalendarProbe = () => (bump("calendar"), useGanttWorkCalendar(), null);
const ReadOnlyProbe = () => (bump("readOnly"), useGanttReadOnly(), null);
const TaskStateProbe = () => (bump("taskState"), useGanttTaskState(), null);
const SelectionProbe = () => (bump("selection"), useGanttSelectedId(), null);
const ViewportProbe = () => (bump("viewport"), useGanttViewport(), null);
const DependencyProbe = () => (bump("dependency"), useGanttDependency(), null);
const DragActiveProbe = () => (bump("dragActive"), useGanttDragActive(), null);
const DragProbe = () => (bump("drag"), useGanttDependencyDrag(), null);

/** Also mounts the grid scroll element, so viewport metrics can be driven. */
function ScrollProbe() {
  bump("scroll");
  const { gridRef, onGridScroll } = useGanttScroll();
  return <div data-testid="grid" ref={gridRef} onScroll={onGridScroll} />;
}

/**
 * Captures the actions used as stimuli. Reads two contexts, so it is excluded
 * from the assertions — the numbers below are about the single-hook probes.
 */
interface Driver {
  setSelectedId: (id: string | null) => void;
  toggleExpand: (id: string) => void;
  zoomIn: () => void;
  updateTask: (id: string, patch: { progress?: number }) => void;
  startDrag: (state: {
    fromTaskId: string;
    handle: "start" | "end";
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  }) => void;
  endDrag: (to: string | null) => void;
}

function DriverProbe({ out }: { out: React.MutableRefObject<Driver | null> }) {
  const { setSelectedId, toggleExpand, updateTask } = useGanttTaskActions();
  const { zoomIn } = useGanttZoom();
  const { startDrag, endDrag } = useGanttDependency();
  out.current = { setSelectedId, toggleExpand, zoomIn, updateTask, startDrag, endDrag };
  return null;
}

/** Counts renders of a component reading the actions context. */
const TaskActionsProbe = () => (bump("taskActions"), useGanttTaskActions(), null);

function mount(props: Partial<React.ComponentProps<typeof GanttProvider>> = {}) {
  const driver: React.MutableRefObject<Driver | null> = { current: null };
  const children = (
    <>
      <ConfigProbe />
      <LabelsProbe />
      <CalendarProbe />
      <ReadOnlyProbe />
      <TaskStateProbe />
      <TaskActionsProbe />
      <SelectionProbe />
      <ScrollProbe />
      <ViewportProbe />
      <DependencyProbe />
      <DragActiveProbe />
      <DragProbe />
      <DriverProbe out={driver} />
    </>
  );
  const utils = render(
    <GanttProvider tasks={tasks} height={400} {...props}>
      {children}
    </GanttProvider>,
  );
  // Re-rendering must reuse the same `children` element, or React cannot bail
  // out on the subtree and every probe re-renders on every provider render.
  const rerender = (next: Partial<React.ComponentProps<typeof GanttProvider>> = {}) =>
    utils.rerender(
      <GanttProvider tasks={tasks} height={400} {...props} {...next}>
        {children}
      </GanttProvider>,
    );
  return { ...utils, driver, rerender };
}

/** Let the rAF-coalesced viewport measurement land. */
async function flushFrames(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

beforeEach(() => {
  counts.clear();
});

describe("context cadence", () => {
  it("renders every probe exactly once on mount", () => {
    mount();
    const deltas = takeDeltas();
    for (const name of Object.keys(deltas)) {
      expect(deltas[name], name).toBe(1);
    }
    // All 12 single-hook probes reported.
    expect(Object.keys(deltas)).toHaveLength(12);
  });

  it("re-renders nothing when the provider re-renders with identical props", async () => {
    const { rerender } = mount();
    await flushFrames();
    takeDeltas();
    act(() => rerender());
    // The whole point of the memoized context values: a parent re-render with
    // unchanged props must not reach a single consumer. If a value object is
    // rebuilt per render, its probe shows up here.
    expect(takeDeltas()).toEqual({});
  });

  it("keeps selection changes off every context but selection", async () => {
    const { driver } = mount();
    await flushFrames();
    takeDeltas();
    act(() => driver.current!.setSelectedId("3"));
    expect(takeDeltas()).toEqual({ selection: 1 });
  });

  it("keeps expand/collapse off every context but task state", async () => {
    const { driver } = mount();
    await flushFrames();
    takeDeltas();
    act(() => driver.current!.toggleExpand("1"));
    expect(takeDeltas()).toEqual({ taskState: 1 });
  });

  it("keeps an edit off every context but task state", async () => {
    const { driver } = mount();
    await flushFrames();
    takeDeltas();
    act(() => driver.current!.updateTask("3", { progress: 42 }));
    // The action callbacks and columnApi memo on the dependency graph and the
    // scheduling context, not on the task list — so editing a task must not
    // invalidate the actions context and re-render every row.
    expect(takeDeltas()).toEqual({ taskState: 1 });
  });

  it("routes zoom through the config context only", async () => {
    const { driver } = mount();
    await flushFrames();
    takeDeltas();
    act(() => driver.current!.zoomIn());
    // Zoom owns colWidth/scales, so config churns per zoom step — which is
    // exactly why labels and the calendar are kept out of it.
    expect(takeDeltas()).toEqual({ config: 1 });
  });

  it("routes a scroll through the viewport context only", async () => {
    const { getByTestId } = mount();
    await flushFrames();
    takeDeltas();
    const grid = getByTestId("grid");
    grid.scrollTop = 120;
    fireEvent.scroll(grid);
    await flushFrames();
    expect(takeDeltas()).toEqual({ viewport: 1 });
  });

  it("separates drag-start from drag-move", async () => {
    const { driver } = mount();
    await flushFrames();
    takeDeltas();

    act(() =>
      driver.current!.startDrag({
        fromTaskId: "1",
        handle: "end",
        startX: 10,
        startY: 10,
        currentX: 10,
        currentY: 10,
      }),
    );
    // Drag start flips both: "is a drag happening" and the coordinates.
    expect(takeDeltas()).toEqual({ dragActive: 1, drag: 1 });

    act(() =>
      driver.current!.startDrag({
        fromTaskId: "1",
        handle: "end",
        startX: 10,
        startY: 10,
        currentX: 90,
        currentY: 40,
      }),
    );
    // A move updates coordinates only — this split is why the per-row connector
    // handles do not re-render on every drag frame.
    expect(takeDeltas()).toEqual({ drag: 1 });

    act(() => driver.current!.endDrag(null));
    expect(takeDeltas()).toEqual({ dragActive: 1, drag: 1 });
  });

  it("invalidates labels, and the actions context with them", async () => {
    const { rerender } = mount();
    await flushFrames();
    takeDeltas();
    // A fresh inline object per render is the documented footgun: it churns the
    // labels context and re-renders every row and bar.
    //
    // `taskActions` rides along, which the cadence comment does not mention:
    // `columnApi` lists `labelsValue` in its deps (it hands `labels` to custom
    // column renderers), so a labels change also invalidates the actions context
    // and re-renders every TaskListRow. Recorded as current behaviour — a labels
    // change costs two independent row re-render triggers, not one.
    act(() => rerender({ labels: { taskList: "Tasks" } }));
    expect(takeDeltas()).toEqual({ labels: 1, taskActions: 1 });
  });

  it("invalidates read-only, and the actions context with it", async () => {
    const { rerender } = mount();
    await flushFrames();
    takeDeltas();
    // Same coupling as labels, same cause: `columnApi` carries `readOnly` so a
    // column's render can gate its own affordances (ADR-021).
    act(() => rerender({ readOnly: true }));
    expect(takeDeltas()).toEqual({ readOnly: 1, taskActions: 1 });
  });

  it("keys the calendar context by content, not identity", async () => {
    const { rerender } = mount();
    await flushFrames();
    takeDeltas();
    const workday: GanttCalendar = { days: { 1: ["9:00-17:00"] } };
    act(() => rerender({ calendar: { ...workday } }));
    // Fans out to three contexts, all load-bearing: the calendar context itself,
    // task state (the roll-up resolves duration-only children through the
    // calendar, so the display list must be recomputed or every summary bar goes
    // stale), and the actions context (`columnApi.format` is calendar-aware).
    expect(takeDeltas()).toEqual({ calendar: 1, taskState: 1, taskActions: 1 });
    // A fresh-but-equal object must cost nothing: the calendar is content-keyed
    // so it can be written inline, which is what the prop's doc promises.
    act(() => rerender({ calendar: { ...workday } }));
    expect(takeDeltas()).toEqual({});
  });

  it("never re-renders the scroll context after mount", async () => {
    const { driver, getByTestId, rerender } = mount();
    await flushFrames();
    takeDeltas();
    act(() => driver.current!.setSelectedId("2"));
    act(() => driver.current!.toggleExpand("1"));
    act(() => driver.current!.zoomIn());
    act(() => rerender());
    const grid = getByTestId("grid");
    grid.scrollTop = 50;
    fireEvent.scroll(grid);
    await flushFrames();
    // Refs and handlers only, all identity-stable, so this context value is
    // created exactly once for the life of the chart.
    expect(takeDeltas().scroll).toBeUndefined();
  });
});
