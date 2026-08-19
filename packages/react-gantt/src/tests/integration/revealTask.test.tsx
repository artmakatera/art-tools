import { act, fireEvent, render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Gantt } from "../../Gantt";
import type { GanttHandle, GanttTask } from "../../types";

/**
 * `revealTask`, including the ancestor expansion that its documentation has
 * always promised and that was never implemented.
 *
 * `GanttHandle.scrollToTask` said it "auto-expands any collapsed ancestors
 * first", but the reveal only searched the *visible* rows and bailed when the
 * index came back -1 — which is exactly what happens for a task under a collapsed
 * parent. `useExpand.revealAncestors` was the missing half, dead except for its
 * own unit test.
 */

/** parent → child → grandchild, so the walk has two levels to climb. */
const tasks: GanttTask[] = [
  {
    id: "root",
    name: "Root",
    type: "summary",
    startDate: new Date(2026, 0, 1),
    endDate: new Date(2026, 1, 20),
  },
  {
    id: "mid",
    name: "Mid",
    type: "summary",
    parentId: "root",
    startDate: new Date(2026, 0, 5),
    endDate: new Date(2026, 1, 15),
  },
  {
    id: "leaf",
    name: "Leaf",
    parentId: "mid",
    startDate: new Date(2026, 1, 1),
    endDate: new Date(2026, 1, 10),
  },
  { id: "other", name: "Other", startDate: new Date(2026, 0, 2), endDate: new Date(2026, 0, 6) },
];

function mount() {
  const apiRef = createRef<GanttHandle>();
  const utils = render(<Gantt tasks={tasks} height={200} rowHeight={32} apiRef={apiRef} />);
  const rows = () => Array.from(utils.container.querySelectorAll(".taskList .row"));
  return { ...utils, apiRef, rows };
}

/**
 * Toggle the nth expandable row. Targeted by accessible name, not button order —
 * the actions column renders three buttons per row before the tree toggle.
 */
function toggleRow(container: HTMLElement, index: number) {
  const toggles = Array.from(
    container.querySelectorAll<HTMLButtonElement>(
      '.taskList .row button[aria-label="Collapse"], .taskList .row button[aria-label="Expand"]',
    ),
  );
  fireEvent.click(toggles[index]!);
}

describe("revealTask", () => {
  it("expands collapsed ancestors so a hidden task becomes visible", () => {
    const { apiRef, rows, container } = mount();
    expect(rows()).toHaveLength(4);

    // Collapse the root: mid and leaf disappear.
    toggleRow(container, 0);
    expect(rows()).toHaveLength(2);

    act(() => apiRef.current!.revealTask("leaf"));
    // Both ancestors expanded, so the leaf is back in the window.
    expect(rows()).toHaveLength(4);
  });

  it("is a no-op for an id that is not in the chart", () => {
    const { apiRef, rows, container } = mount();
    toggleRow(container, 0);
    const before = rows().length;
    act(() => apiRef.current!.revealTask("nope"));
    expect(rows()).toHaveLength(before);
  });

  it("does not expand anything when the task is already visible", () => {
    const { apiRef, rows, container } = mount();
    toggleRow(container, 0);
    expect(rows()).toHaveLength(2);
    // "other" is a root-level sibling, visible even with the root collapsed —
    // revealing it must not un-collapse the tree.
    act(() => apiRef.current!.revealTask("other"));
    expect(rows()).toHaveLength(2);
  });

  it("scrolls vertically by default and horizontally only when asked", () => {
    const { apiRef, container } = mount();
    const grid = container.querySelector<HTMLDivElement>(".gridWrapper")!;
    Object.defineProperty(grid, "clientWidth", { value: 200, configurable: true });
    expect(grid.scrollLeft).toBe(0);

    // Default: vertical only, so the far bar stays off-screen horizontally.
    act(() => apiRef.current!.revealTask("leaf"));
    expect(grid.scrollLeft).toBe(0);

    // Opt in and the grid scrolls to the bar.
    act(() => apiRef.current!.revealTask("leaf", { horizontal: true }));
    expect(grid.scrollLeft).toBeGreaterThan(0);
  });

  it("leaves no pending reveal behind to fire on a later expand", () => {
    // The pending slot is cleared unconditionally in the layout effect; if it were
    // not, expanding something unrelated later would trigger a surprise scroll.
    const { apiRef, container, rows } = mount();
    toggleRow(container, 0);
    act(() => apiRef.current!.revealTask("leaf"));
    expect(rows()).toHaveLength(4);

    toggleRow(container, 0);
    expect(rows()).toHaveLength(2);
    // Re-expanding by hand must not re-run the earlier reveal.
    toggleRow(container, 0);
    expect(rows()).toHaveLength(4);
  });
});
