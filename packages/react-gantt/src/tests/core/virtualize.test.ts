import { describe, expect, it } from "vitest";
import { rangeFromOffset } from "../../core/virtualize";
import { UNMEASURED_FALLBACK_COUNT } from "../../core/constants";

describe("rangeFromOffset", () => {
  it("returns an empty range when there are no items", () => {
    expect(rangeFromOffset(0, 500, 40, 0)).toEqual({ start: 0, end: 0 });
  });

  it("renders everything before the viewport is measured when the list is small (viewSize <= 0)", () => {
    expect(rangeFromOffset(0, 0, 40, 50)).toEqual({ start: 0, end: 50 });
    expect(rangeFromOffset(120, -1, 40, 50)).toEqual({ start: 0, end: 50 });
  });

  it("caps the unmeasured fallback so large datasets never render unwindowed", () => {
    expect(rangeFromOffset(0, 0, 40, 10_000)).toEqual({
      start: 0,
      end: UNMEASURED_FALLBACK_COUNT,
    });
  });

  it("renders the capped fallback when itemSize is non-positive", () => {
    expect(rangeFromOffset(0, 500, 0, 50)).toEqual({ start: 0, end: 50 });
    expect(rangeFromOffset(0, 500, 0, 10_000)).toEqual({
      start: 0,
      end: UNMEASURED_FALLBACK_COUNT,
    });
  });

  it("covers the items intersecting the viewport with no overscan", () => {
    // 500px viewport at offset 0, 40px items -> indices [0, 13) (ceil(500/40)=13).
    expect(rangeFromOffset(0, 500, 40, 100)).toEqual({ start: 0, end: 13 });
  });

  it("windows correctly mid-scroll", () => {
    // offset 400 -> first visible floor(400/40)=10; end ceil(900/40)=23.
    expect(rangeFromOffset(400, 500, 40, 100)).toEqual({ start: 10, end: 23 });
  });

  it("widens the range by overscan on both sides", () => {
    expect(rangeFromOffset(400, 500, 40, 100, 4)).toEqual({ start: 6, end: 27 });
  });

  it("clamps the start to 0 near the top", () => {
    expect(rangeFromOffset(40, 200, 40, 100, 4)).toEqual({ start: 0, end: 10 });
  });

  it("clamps the end to itemCount near the bottom", () => {
    // 100 items * 40px = 4000px tall. Scrolled near the end.
    expect(rangeFromOffset(3600, 500, 40, 100, 4)).toEqual({ start: 86, end: 100 });
  });
});
