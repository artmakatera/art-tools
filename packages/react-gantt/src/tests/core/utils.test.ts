import { describe, expect, it, vi } from "vitest";
import { memoize } from "../../core/utils";

/**
 * `memoize` had no test, yet it is what caches `getMinMaxDates` (cacheSize 3) —
 * so the correctness of every origin and timeline computation depends on its
 * cache-key behaviour. It is keyed on argument *identity*, which is the whole
 * reason `visibleTasks` has to stay referentially stable.
 */

describe("memoize", () => {
  it("returns the cached result for an identical argument", () => {
    const fn = vi.fn((xs: number[]) => xs.length);
    const memoized = memoize(fn, 3);
    const arg = [1, 2, 3];
    expect(memoized(arg)).toBe(3);
    expect(memoized(arg)).toBe(3);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("misses on an equal-but-fresh argument", () => {
    // Keyed by identity, not content: this is precisely why a fresh array each
    // render defeats the cache, and why callers memoize their task lists.
    const fn = vi.fn((xs: number[]) => xs.length);
    const memoized = memoize(fn, 3);
    memoized([1, 2, 3]);
    memoized([1, 2, 3]);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("keeps several distinct arguments cached up to its size", () => {
    const fn = vi.fn((xs: number[]) => xs.length);
    const memoized = memoize(fn, 3);
    const a = [1];
    const b = [1, 2];
    const c = [1, 2, 3];
    memoized(a);
    memoized(b);
    memoized(c);
    expect(fn).toHaveBeenCalledTimes(3);
    // All three still resident, so re-asking costs nothing.
    memoized(a);
    memoized(b);
    memoized(c);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("evicts the least recently used entry past its size", () => {
    const fn = vi.fn((xs: number[]) => xs.length);
    const memoized = memoize(fn, 2);
    const a = [1];
    const b = [1, 2];
    const c = [1, 2, 3];
    memoized(a);
    memoized(b);
    memoized(a); // `a` is now the most recent, so `b` is next out
    memoized(c);
    expect(fn).toHaveBeenCalledTimes(3);
    memoized(a);
    expect(fn).toHaveBeenCalledTimes(3); // still cached
    memoized(b);
    expect(fn).toHaveBeenCalledTimes(4); // evicted, recomputed
  });

  it("treats a null result as a cache miss and recomputes it", () => {
    // Current behaviour, recorded rather than endorsed: the hit test is
    // `cached != null`, so a memoized function that legitimately returns null or
    // undefined is never cached. Harmless for its one caller — getMinMaxDates
    // returns null only for an empty task list, where recomputing costs nothing —
    // but a trap for any future use whose empty answer is expensive.
    const fn = vi.fn((_xs: number[]) => null);
    const memoized = memoize(fn, 3);
    const arg: number[] = [];
    expect(memoized(arg)).toBeNull();
    expect(memoized(arg)).toBeNull();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does cache a falsy-but-defined result", () => {
    // `!= null` excludes only null and undefined, so 0 and "" are cached.
    const fn = vi.fn((_xs: number[]) => 0);
    const memoized = memoize(fn, 3);
    const arg = [1];
    expect(memoized(arg)).toBe(0);
    expect(memoized(arg)).toBe(0);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
