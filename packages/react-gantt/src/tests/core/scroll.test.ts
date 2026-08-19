import { describe, expect, it } from "vitest";
import { scrollOffsetToReveal } from "../../core/scroll";

describe("scrollOffsetToReveal", () => {
  it("keeps the offset when the span is already fully visible", () => {
    // span [120,180] inside viewport [100,300]
    expect(scrollOffsetToReveal(120, 60, 100, 200)).toBe(100);
  });

  it("scrolls back when the span is to the left of the viewport", () => {
    // span starts at 40, viewport at 100 → reveal with 10px margin
    expect(scrollOffsetToReveal(40, 60, 100, 200, 10)).toBe(30);
  });

  it("scrolls forward when the span is to the right of the viewport", () => {
    // span [640,1880], viewport size 200 at 0 → bring its right edge + margin in
    expect(scrollOffsetToReveal(640, 1240, 0, 200, 40)).toBe(1720);
  });

  it("never returns a negative offset", () => {
    expect(scrollOffsetToReveal(0, 50, 100, 200, 40)).toBe(0);
  });

  it("defaults margin to 0", () => {
    expect(scrollOffsetToReveal(40, 60, 100, 200)).toBe(40);
  });
});
