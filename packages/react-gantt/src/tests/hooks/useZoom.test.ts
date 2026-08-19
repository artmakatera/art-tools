import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useZoom } from "../../hooks/useZoom";
import { DEFAULT_ZOOM_LEVELS } from "../../core/zoom";
import { dateAtOffset, getMinMaxDates, resolveOrigin } from "../../core/dateUtils";
import { resolveColumnStep, resolveColumnUnit } from "../../core/scales";
import type { GanttTask } from "../../types";

/**
 * Zoom anchoring, pinned before the timeline-origin refactor.
 *
 * `useZoom` derives the origin itself with its own copy of the
 * `getMinMaxDates` → `resolveColumnUnit` → `resolveColumnStep` → `resolveOrigin`
 * recipe — twice, in fact, byte-identically, in `zoomAt` and in the layout
 * effect. Both copies are slated to be replaced by one shared helper, and the
 * anchoring maths is the only thing that proves the replacement is equivalent.
 *
 * The re-anchoring layout effect also depends on `[index]` alone, deliberately
 * (re-running it on task edits would fight the user's scroll position). Its
 * `eslint-disable react-hooks/exhaustive-deps` is inert — this package lints with
 * oxlint — so the behaviour has no enforcement other than these tests.
 */

const tasks: GanttTask[] = [
  { id: "1", name: "A", startDate: new Date(2026, 0, 5), endDate: new Date(2026, 2, 20) },
];

/** A stand-in for the grid scroll container; jsdom gives no layout of its own. */
function fakeGrid(clientWidth = 400, scrollLeft = 0) {
  const el = document.createElement("div");
  Object.defineProperty(el, "clientWidth", { value: clientWidth, configurable: true });
  el.scrollLeft = scrollLeft;
  return el;
}

function setup(grid: HTMLDivElement | null, initialIndex = 3) {
  const gridRef = { current: grid };
  return renderHook(() =>
    useZoom({
      gridRef,
      visibleTasks: tasks,
      padDays: 1,
      levels: DEFAULT_ZOOM_LEVELS,
      initialIndex,
    }),
  );
}

describe("useZoom", () => {
  it("starts on the requested rung and reports the ladder size", () => {
    const { result } = setup(fakeGrid());
    expect(result.current.index).toBe(3);
    expect(result.current.count).toBe(DEFAULT_ZOOM_LEVELS.length);
    expect(result.current.level).toBe(DEFAULT_ZOOM_LEVELS[3]);
  });

  it("clamps the initial index into the ladder", () => {
    expect(setup(fakeGrid(), 99).result.current.index).toBe(DEFAULT_ZOOM_LEVELS.length - 1);
    expect(setup(fakeGrid(), -5).result.current.index).toBe(0);
  });

  it("reports the rung ends so controls can disable", () => {
    const coarsest = setup(fakeGrid(), 0).result;
    expect(coarsest.current.canZoomOut).toBe(false);
    expect(coarsest.current.canZoomIn).toBe(true);

    const finest = setup(fakeGrid(), DEFAULT_ZOOM_LEVELS.length - 1).result;
    expect(finest.current.canZoomIn).toBe(false);
    expect(finest.current.canZoomOut).toBe(true);
  });

  it("steps one rung at a time and stops at the ends", () => {
    const { result } = setup(fakeGrid(), 0);
    act(() => result.current.zoomOut());
    expect(result.current.index).toBe(0); // already coarsest — no move
    act(() => result.current.zoomIn());
    expect(result.current.index).toBe(1);
    act(() => result.current.setZoom(99));
    expect(result.current.index).toBe(DEFAULT_ZOOM_LEVELS.length - 1);
  });

  it("keeps the date under the cursor under that same pixel", () => {
    // The contract: zoomAt(focusPx, delta) captures the date at focusPx on the
    // OLD level, then after committing the new level reassigns scrollLeft so that
    // date sits back at the same offset from the viewport's left edge.
    //
    // Asserted as the invariant rather than by replaying the internal arithmetic:
    // resolve the date at the anchor pixel before and after, and require them to
    // be the same instant. That stays true however the origin is derived.
    // Parameters chosen so the re-anchored scroll stays positive; see the
    // clamping test below for the case where it does not.
    const grid = fakeGrid(400, 600);
    const { result } = setup(grid, 3);
    const focusPx = 700; // content-space: 100px into a viewport scrolled to 600
    const viewportOffset = focusPx - grid.scrollLeft;

    const dateAt = (level: (typeof DEFAULT_ZOOM_LEVELS)[number], contentPx: number) => {
      const unit = resolveColumnUnit(level.scales);
      const step = resolveColumnStep(level.scales);
      const origin = resolveOrigin(getMinMaxDates(tasks)!.min, unit, 1, step);
      return dateAtOffset(origin, unit, contentPx / level.colWidth).getTime();
    };

    const focusDate = dateAt(DEFAULT_ZOOM_LEVELS[3]!, focusPx);
    act(() => result.current.zoomAt(focusPx, -1));
    expect(result.current.index).toBe(2);

    const anchoredDate = dateAt(DEFAULT_ZOOM_LEVELS[2]!, grid.scrollLeft + viewportOffset);
    // Within a minute: the anchor is stored as a date and re-projected through a
    // coarser column, so it round-trips to sub-column precision, not exactly.
    expect(Math.abs(anchoredDate - focusDate)).toBeLessThan(60_000);
  });

  it("clamps the re-anchored scroll at content start rather than going negative", () => {
    // Zooming out from day columns (40px) to week columns (60px) compresses the
    // content, so a date 22.5 day-columns along lands only ~4 week-columns along
    // — less than the 300px the anchor wanted to keep to its left. The anchor is
    // sacrificed to the content edge instead of scrolling negative.
    const grid = fakeGrid(400, 600);
    const { result } = setup(grid, 3);
    act(() => result.current.zoomAt(900, -1));
    expect(result.current.index).toBe(2);
    expect(grid.scrollLeft).toBe(0);
  });

  it("still changes rung when there is no grid to anchor against", () => {
    const { result } = setup(null, 3);
    act(() => result.current.zoomIn());
    expect(result.current.index).toBe(4);
  });
});
