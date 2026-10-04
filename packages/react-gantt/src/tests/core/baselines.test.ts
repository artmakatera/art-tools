import { describe, expect, it, vi } from "vitest";
import { baselineLaneCount, baselineStripHeight, visibleBaselinesOf } from "../../core/baselines";
import { buildTimelineDates, timelineOrigin } from "../../core/timeline";
import type { GanttBaseline, GanttTask } from "../../types";
import { computeLinkGeometry } from "../../components/dependency-links/geometry";

const date = (day: number) => new Date(2026, 0, day);

describe("baseline data", () => {
  it("excludes hidden plans from both ends of the axis and its origin", () => {
    const task: GanttTask = {
      id: "a",
      name: "A",
      startDate: date(10),
      endDate: date(12),
      baselines: [{ id: "plan", startDate: date(1), endDate: date(20) }],
    };
    expect(timelineOrigin([task], undefined, 0, false)).toEqual(date(10));
    expect(buildTimelineDates([task], 0, undefined, false)).toEqual([date(10), date(11), date(12)]);
    expect(timelineOrigin([task], undefined, 0, true)).toEqual(date(1));
    expect(buildTimelineDates([task], 0, undefined, true).at(-1)).toEqual(date(20));
  });

  it("uses at most the first five plans for the axis and row height", () => {
    const task: GanttTask = {
      id: "a",
      name: "A",
      startDate: date(10),
      endDate: date(12),
      baselines: [1, 2, 3, 4, 5, 6].map((day) => ({
        id: day,
        startDate: date(day === 6 ? 1 : day + 10),
        endDate: date(day === 6 ? 2 : day + 11),
      })),
    };

    expect(visibleBaselinesOf(task)).toHaveLength(5);
    expect(baselineLaneCount([task])).toBe(5);
    expect(baselineStripHeight(5)).toBe(25);
    expect(timelineOrigin([task], undefined, 0, true)).toEqual(date(10));
    expect(buildTimelineDates([task], 0, undefined, true).at(-1)).toEqual(date(16));
  });

  it("uses an explicit summary plan and a milestone instant", () => {
    const summary: GanttTask = {
      id: "parent",
      name: "Parent",
      type: "summary",
      startDate: date(10),
      endDate: date(12),
      baselines: [{ id: "old", startDate: date(3), endDate: date(6) }],
    };
    const milestone: GanttTask = {
      id: "milestone",
      name: "Milestone",
      type: "milestone",
      startDate: date(10),
      baselines: [{ id: "old", startDate: date(20) }],
    };
    expect(timelineOrigin([summary, milestone], undefined, 0, true)).toEqual(date(3));
    expect(buildTimelineDates([summary, milestone], 0, undefined, true).at(-1)).toEqual(date(20));
    expect(baselineLaneCount([{ ...summary, baselines: undefined }])).toBe(0);
  });

  it("skips malformed entries without promoting the sixth", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const task: GanttTask = {
        id: "a",
        name: "A",
        startDate: date(10),
        endDate: date(12),
        baselines: [
          { id: "bad", startDate: date(5) },
          { id: "valid", startDate: date(6), endDate: date(7) },
          { id: "valid", startDate: date(7), endDate: date(8) },
          { id: "reverse", startDate: date(9), endDate: date(8) },
          { id: "valid2", startDate: date(8), endDate: date(9) },
          { id: "sixth", startDate: date(1), endDate: date(2) },
        ],
      };
      expect(visibleBaselinesOf(task).map((baseline) => baseline.id)).toEqual(["valid", "valid2"]);
      expect(timelineOrigin([task], undefined, 0, true)).toEqual(date(6));
      expect(warning).toHaveBeenCalledTimes(3);
    } finally {
      warning.mockRestore();
    }
  });

  it("keeps dependency endpoints centered on live bars when rows gain lanes", () => {
    const tasks: GanttTask[] = [
      { id: "a", name: "A", startDate: date(1), endDate: date(3) },
      { id: "b", name: "B", startDate: date(4), endDate: date(6) },
    ];
    const geometry = computeLinkGeometry({
      tasks,
      dependencies: [{ from: "a", to: "b", type: "FS" }],
      origin: date(1),
      colWidth: 40,
      rowHeight: 52,
      barRowHeight: 36,
      unit: "day",
    });
    expect(geometry.links[0]!.points[0]!.y).toBe(18);
    expect(geometry.links[0]!.points.at(-1)!.y).toBe(70);
  });

  it("does not crash on malformed runtime values", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const task: GanttTask = {
        id: "malformed",
        name: "Malformed",
        startDate: date(10),
        endDate: date(12),
        baselines: [
          null as unknown as GanttBaseline,
          { id: "text", startDate: "2026-01-01" as unknown as Date, endDate: date(2) },
        ],
      };
      expect(visibleBaselinesOf(task)).toEqual([]);
      expect(timelineOrigin([task], undefined, 0, true)).toEqual(date(10));
      expect(warning).toHaveBeenCalledTimes(2);
    } finally {
      warning.mockRestore();
    }
  });
});
