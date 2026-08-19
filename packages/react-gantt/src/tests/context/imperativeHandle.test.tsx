import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createRef } from "react";
import { Gantt } from "../../Gantt";
import type { ColumnApi, ColumnDef, GanttCalendar, GanttHandle, GanttTask } from "../../types";

/**
 * The imperative surface, pinned before it is refactored.
 *
 * `apiRef` and `columnApi` are built in two separate `useMemo`s in
 * `GanttContext.tsx` that share nine members, and `columnApi.format` does
 * working-time date math inline inside one of them. Both are slated to move, so
 * these tests record the surface and the exact values it produces first.
 */

const tasks: GanttTask[] = [
  { id: "1", name: "Design", startDate: new Date(2026, 0, 5), endDate: new Date(2026, 0, 15) },
  { id: "2", name: "Build", startDate: new Date(2026, 0, 15), endDate: new Date(2026, 0, 20) },
];

/** A column whose only job is to hand the live `ColumnApi` back to the test. */
function captureColumn(out: { current: ColumnApi | null }): ColumnDef {
  return {
    key: "probe",
    header: "probe",
    render: (_task, api) => {
      out.current = api;
      return null;
    },
  };
}

function mountWithApi(props: Partial<React.ComponentProps<typeof Gantt>> = {}) {
  const apiRef = createRef<GanttHandle>();
  const columnApi: { current: ColumnApi | null } = { current: null };
  const utils = render(
    <Gantt
      tasks={tasks}
      height={300}
      apiRef={apiRef}
      columns={[captureColumn(columnApi)]}
      {...props}
    />,
  );
  return { ...utils, apiRef, columnApi };
}

describe("apiRef surface", () => {
  it("exposes exactly the documented handle members", () => {
    const { apiRef } = mountWithApi();
    expect(Object.keys(apiRef.current!).toSorted()).toEqual([
      "createTask",
      "deleteTask",
      "redo",
      "scrollToTask",
      "setZoom",
      "undo",
      "updateTask",
      "zoomIn",
      "zoomOut",
    ]);
  });

  it("shares every handle member with columnApi", () => {
    const { apiRef, columnApi } = mountWithApi();
    for (const key of Object.keys(apiRef.current!)) {
      expect(typeof (columnApi.current as unknown as Record<string, unknown>)[key], key).toBe(
        "function",
      );
    }
    // columnApi is the handle plus the extras a column render needs.
    expect(Object.keys(columnApi.current!).toSorted()).toEqual([
      "createTask",
      "deleteTask",
      "editTask",
      "format",
      "labels",
      "readOnly",
      "redo",
      "scrollToTask",
      "setZoom",
      "undo",
      "updateTask",
      "zoomIn",
      "zoomOut",
    ]);
  });

  it("drives an edit through updateTask and undo/redo", () => {
    const { apiRef, columnApi } = mountWithApi();
    act(() => apiRef.current!.updateTask("1", { progress: 40 }));
    expect(columnApi.current!.readOnly).toBe(false);
    act(() => apiRef.current!.undo());
    act(() => apiRef.current!.redo());
    // The point is that these are callable and do not throw through the
    // transition-scheduled log path, not the resulting pixel state.
    expect(apiRef.current).not.toBeNull();
  });

  it("reports readOnly through columnApi", () => {
    const { columnApi } = mountWithApi({ readOnly: true });
    expect(columnApi.current!.readOnly).toBe(true);
  });
});

describe("columnApi.format", () => {
  it("renders the inclusive display end from an exclusive stored end", () => {
    const { columnApi } = mountWithApi();
    // Stored end is exclusive (ADR-014): Jan 5..15 exclusive displays as Jan 14.
    const end = columnApi.current!.format.endDate(tasks[0]!);
    expect(end).toEqual(new Date(2026, 0, 14));
  });

  it("counts duration in whole days with no calendar", () => {
    const { columnApi } = mountWithApi();
    expect(columnApi.current!.format.duration(tasks[0]!)).toBe(10);
    expect(columnApi.current!.format.duration(tasks[1]!)).toBe(5);
  });

  it("returns undefined for an end that does not advance past the start", () => {
    const instant: GanttTask = {
      id: "m",
      name: "Milestone",
      type: "milestone",
      startDate: new Date(2026, 0, 5),
      endDate: new Date(2026, 0, 5),
    };
    const { columnApi } = mountWithApi({ tasks: [instant] });
    expect(columnApi.current!.format.endDate(instant)).toBeUndefined();
  });

  it("counts duration in working days once a calendar excludes the weekend", () => {
    // Jan 5 2026 is a Monday, so Jan 5..15 exclusive spans two weekends' worth of
    // Sat/Sun: 10 calendar days, 8 working days.
    const calendar: GanttCalendar = { days: { 0: false, 6: false } };
    const { columnApi } = mountWithApi({ calendar });
    expect(columnApi.current!.format.duration(tasks[0]!)).toBe(8);
  });

  it("counts duration in hours when durationUnit is hour", () => {
    const calendar: GanttCalendar = { hours: ["9:00-17:00"], days: { 0: false, 6: false } };
    const { columnApi } = mountWithApi({ calendar, durationUnit: "hour" });
    // 8 working days x an 8-hour day.
    expect(columnApi.current!.format.duration(tasks[0]!)).toBe(64);
  });
});
