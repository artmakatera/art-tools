import { describe, expect, it, vi } from "vitest";
import {
  timelineElementX,
  isTimelineElementVisible,
  validTimelineElements,
} from "../../core/timelineElements";

const date = (day: number, hour = 0) => new Date(2026, 0, day, hour);

describe("timeline element geometry", () => {
  it("places fractional instants and respects multi-unit columns", () => {
    expect(timelineElementX(date(2, 12), date(1), "day", 2, 100)).toBe(75);
    expect(timelineElementX(date(1, 3), date(1), "hour", 2, 100)).toBe(150);
    expect(timelineElementX(new Date(2026, 1, 1), date(1), "month", 1, 100)).toBe(100);
  });
  it("culls outside the axis and uses per-element overscan", () => {
    expect(isTimelineElementVisible(-1, 1000, 0, 100)).toBe(false);
    expect(isTimelineElementVisible(1000, 1000, 900, 100)).toBe(false);
    expect(isTimelineElementVisible(400, 1000, 0, 100)).toBe(false);
    expect(isTimelineElementVisible(400, 1000, 0, 100, 400)).toBe(true);
    expect(isTimelineElementVisible(50, 1000, 400, 100)).toBe(false);
    expect(isTimelineElementVisible(50, 1000, 400, 100, 400)).toBe(true);
  });
  it("skips invalid dates and duplicate React keys but allows shared dates", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const elements = [
      { render: () => null, key: 1, date: date(1) },
      { render: () => null, key: "1", date: date(2) },
      { render: () => null, key: "bad", date: new Date(NaN) },
      { render: () => null, key: "other", date: date(1) },
    ];
    expect(validTimelineElements(elements)).toEqual([elements[0], elements[3]]);
    expect(warning).toHaveBeenCalledTimes(2);
    warning.mockRestore();
  });
});
