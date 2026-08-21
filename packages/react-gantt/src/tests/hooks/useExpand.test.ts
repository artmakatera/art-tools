import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useExpand } from "../../hooks/useExpand";
import type { GanttTask } from "../../index";

// parent → child → grandchild, so revealAncestors must walk two levels.
const tasks: GanttTask[] = [
  { id: "1", name: "Parent", startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 31) },
  {
    id: "2",
    name: "Child",
    parentId: "1",
    startDate: new Date(2026, 0, 2),
    endDate: new Date(2026, 0, 10),
  },
  {
    id: "3",
    name: "Grandchild",
    parentId: "2",
    startDate: new Date(2026, 0, 3),
    endDate: new Date(2026, 0, 8),
  },
];

describe("useExpand.revealAncestors", () => {
  it("re-expands collapsed ancestors so the target becomes visible", () => {
    const { result } = renderHook(() => useExpand(tasks));

    // Collapse the top-level parent: child and grandchild are hidden.
    act(() => result.current.toggleExpand("1"));
    expect(result.current.visibleTasks.map((t) => t.id)).toEqual(["1"]);

    // Revealing the grandchild must expand every ancestor on its parent chain.
    act(() => result.current.revealAncestors("3"));
    expect(result.current.visibleTasks.map((t) => t.id)).toEqual(["1", "2", "3"]);
  });

  it("is a no-op (stable visibleTasks identity) when nothing is collapsed", () => {
    const { result } = renderHook(() => useExpand(tasks));
    const before = result.current.visibleTasks;

    act(() => result.current.revealAncestors("3"));

    // setCollapsedIds returned prev unchanged → no re-render → same array reference.
    expect(result.current.visibleTasks).toBe(before);
  });

  it("ignores an unknown id", () => {
    const { result } = renderHook(() => useExpand(tasks));
    act(() => result.current.toggleExpand("1"));

    act(() => result.current.revealAncestors("does-not-exist"));

    // The bogus walk finds no ancestors, so the collapse state is untouched.
    expect(result.current.visibleTasks.map((t) => t.id)).toEqual(["1"]);
  });
});
