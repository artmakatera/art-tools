import { useRef } from "react";
import { buildCalendar, calendarKey, type ResolvedCalendar } from "../core/calendar";
import type { GanttCalendar } from "../types";

interface Cached {
  key: string;
  value: ResolvedCalendar | null;
}

/**
 * Resolve a {@link GanttCalendar} into its queryable form, keyed by **content**.
 *
 * Consumers write the prop inline — `calendar={{ hours: [...], dates: {...} }}` —
 * so a fresh object arrives on every render. Keying on identity would rebuild the
 * calendar each time and, worse, churn the identity that the task-list memo and
 * every downstream cache depend on. Hashing the spec instead makes an inline
 * object free, and the returned object is identity-stable for as long as the
 * content is unchanged, so callers can use it as a plain dependency.
 *
 * Deliberately a ref rather than `useMemo`: the cache key is derived, not a
 * dependency list, and `useMemo` offers no correctness guarantee anyway.
 *
 * Returns `null` when no calendar is supplied — the signal for plain linear time
 * throughout `core/*`.
 */
export function useResolvedCalendar(calendar?: GanttCalendar): ResolvedCalendar | null {
  const cache = useRef<Cached | null>(null);
  const key = calendarKey(calendar);

  if (!cache.current || cache.current.key !== key) {
    cache.current = {
      key,
      value: calendar ? buildCalendar(calendar, key) : null,
    };
  }
  return cache.current.value;
}
