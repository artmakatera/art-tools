import { useCallback, useRef } from "react";

/**
 * Wrap an optional callback in a stable identity that always calls the latest
 * version. Presence-preserving: `undefined` in → `undefined` out, so the
 * returned identity only changes when the callback's presence flips — never
 * when the consumer passes a new inline function. Use for callbacks handed to
 * consumers through context/memoized values so they don't churn on re-render.
 */
export function useEventCallback<A extends unknown[], R>(
  fn: ((...args: A) => R) | undefined,
): ((...args: A) => R) | undefined {
  const ref = useRef(fn);
  ref.current = fn;
  const stable = useCallback((...args: A) => ref.current?.(...args) as R, []);
  if (!fn) {
    return undefined;
  }
  return stable;
}
