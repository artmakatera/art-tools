import { useRef } from "react";

/**
 * Ref that always holds the latest `value`, written during render (not in an
 * effect). The render-phase write is deliberate and load-bearing: same-render
 * reads must see the current value — e.g. `createTask` flushSync-commits,
 * re-renders synchronously, then immediately reads refs updated by that very
 * render. Do not convert to an effect. (Same pattern as `useTaskList`'s
 * optionsRef and `useDrag`'s onDragRef.)
 */
export function useLatestRef<T>(value: T): React.RefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
