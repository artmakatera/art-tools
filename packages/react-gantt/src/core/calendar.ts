import type { DayHours, GanttCalendar, Weekday, WorkTimeRange } from "../types";
import { civilDayIndex } from "./dateUtils";

export const MINUTES_PER_DAY = 1440;
export const MS_PER_MINUTE = 60_000;

/** Every day fully working — the shape a calendar resolves to when `hours` is omitted. */
const FULL_DAY_INTERVALS: readonly number[] = [0, MINUTES_PER_DAY];

/**
 * The normalized working intervals of one civil day, as minutes from local
 * midnight. Sorted, non-overlapping, and non-adjacent — `["8:00-12:00",
 * "12:00-17:00"]` merges to a single `8:00-17:00` interval and interns
 * identically to it.
 */
export interface DayShape {
  /** Flattened `[from0, to0, from1, to1, …]`. Empty means a day off. */
  readonly intervals: readonly number[];
  /**
   * Cumulative working minutes *before* each interval, so `prefix[i]` is the
   * work done by the time interval `i` starts. `prefix[0]` is always 0.
   */
  readonly prefix: readonly number[];
  /** Total working minutes: 0 for a day off, 1440 for a full day. */
  readonly totalMinutes: number;
  /** Interning id — structurally identical shapes are `===`, so `id` is only for debugging. */
  readonly id: number;
}

/**
 * A {@link GanttCalendar} resolved into a queryable form. Immutable, framework-free,
 * and identity-stable per content (see `calendarKey`), so it is safe to use
 * directly as a React dependency or cache key.
 */
export interface ResolvedCalendar {
  readonly key: string;
  /** Indexed by `Date.prototype.getDay()`; the global `hours` are already folded in. */
  readonly byWeekday: readonly DayShape[];
  /** Civil day index → shape, for `dates` overrides only. */
  readonly byDate: ReadonlyMap<number, DayShape>;
  /** Sorted `byDate` keys, so a walk can find the next override in O(log n). */
  readonly overrideDays: readonly number[];
  /** Every weekday is a full 00:00–24:00 day and there are no date overrides. */
  readonly isAlwaysWorking: boolean;
  /** No shape is partial — each is either empty or a full day. */
  readonly isDayGranular: boolean;
  /** Working minutes across the seven weekday shapes. 0 means a degenerate calendar. */
  readonly weekMinutes: number;
  /** Working ms that one `durationUnit: "day"` represents (ADR-018: the week's longest working day). */
  readonly msPerWorkingDay: number;
}

const RANGE_RE = /^\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*$/;

/**
 * Parse one `"H:MM-H:MM"` range into `[fromMinute, toMinute)`. Throws on anything
 * unparseable so a typo surfaces at the edge rather than as a silently wrong schedule.
 */
export function parseWorkTimeRange(range: WorkTimeRange): [number, number] {
  const m = RANGE_RE.exec(range);
  if (!m) {
    throw new Error(
      `Invalid working-hours range ${JSON.stringify(range)}: expected "H:MM-H:MM", e.g. "8:30-12:00".`,
    );
  }
  const from = Number(m[1]) * 60 + Number(m[2]);
  const to = Number(m[3]) * 60 + Number(m[4]);
  if (from < 0 || from >= MINUTES_PER_DAY) {
    throw new Error(
      `Invalid working-hours range ${JSON.stringify(range)}: start must be within the day.`,
    );
  }
  if (to <= from || to > MINUTES_PER_DAY) {
    throw new Error(
      `Invalid working-hours range ${JSON.stringify(range)}: end must be after start and no later than 24:00.`,
    );
  }
  return [from, to];
}

/** Sort, merge adjacent/overlapping, and flatten a day's ranges into interval pairs. */
function normalizeIntervals(hours: DayHours | undefined): readonly number[] {
  if (hours === undefined) {
    return FULL_DAY_INTERVALS;
  }
  if (hours === false) {
    return [];
  }
  const pairs = hours.map(parseWorkTimeRange).toSorted((a, b) => a[0] - b[0]);
  const out: number[] = [];
  for (const [from, to] of pairs) {
    const lastEnd = out.length > 0 ? out[out.length - 1]! : undefined;
    if (lastEnd !== undefined && from <= lastEnd) {
      // Overlapping or adjacent — extend the run rather than emitting a gap.
      if (to > lastEnd) {
        out[out.length - 1] = to;
      }
      continue;
    }
    out.push(from, to);
  }
  return out;
}

function makeShape(intervals: readonly number[], id: number): DayShape {
  const prefix: number[] = [];
  let total = 0;
  for (let i = 0; i < intervals.length; i += 2) {
    prefix.push(total);
    total += intervals[i + 1]! - intervals[i]!;
  }
  return { intervals, prefix, totalMinutes: total, id };
}

/** Interns shapes by their normalized signature so identical days compare with `===`. */
function shapeInterner() {
  const cache = new Map<string, DayShape>();
  return (intervals: readonly number[]): DayShape => {
    const signature = intervals.join(",");
    const existing = cache.get(signature);
    if (existing) {
      return existing;
    }
    const shape = makeShape(intervals, cache.size);
    cache.set(signature, shape);
    return shape;
  };
}

function hoursKey(hours: DayHours | undefined): string {
  if (hours === undefined) {
    return "*";
  }
  if (hours === false) {
    return "-";
  }
  return hours.join(",");
}

/**
 * A deterministic structural key for a calendar spec.
 *
 * Consumers write `calendar={{ … }}` inline, so keying the resolved calendar by
 * object *identity* would rebuild it — and invalidate everything memoized on it —
 * on every render. Keying by content makes an inline object free.
 *
 * `dates` keys are sorted explicitly: integer-like keys (`days`) are ordered by
 * the JS engine, but `"2026-01-01"` keys keep insertion order, which would
 * otherwise leak into the key. Keys are compared *raw*, so `"8:00-12:00"` and
 * `"08:00-12:00"` produce different keys for the same calendar — a cache miss,
 * never a wrong answer, and normalizing first would cost the parse this avoids.
 */
export function calendarKey(calendar: GanttCalendar | undefined): string {
  if (!calendar) {
    return "";
  }
  const parts: string[] = [hoursKey(calendar.hours)];
  for (let day = 0; day < 7; day++) {
    const hours = calendar.days?.[day as Weekday];
    if (hours !== undefined) {
      parts.push(`${day}=${hoursKey(hours)}`);
    }
  }
  const dates = calendar.dates;
  if (dates) {
    for (const date of Object.keys(dates).toSorted()) {
      parts.push(`${date}=${hoursKey(dates[date])}`);
    }
  }
  return parts.join("|");
}

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function dayIndexFromDateKey(key: string): number {
  const m = DATE_KEY_RE.exec(key);
  if (!m) {
    throw new Error(
      `Invalid calendar date key ${JSON.stringify(key)}: expected a local civil date, "YYYY-MM-DD".`,
    );
  }
  return civilDayIndex(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/**
 * Resolve a spec into a queryable calendar. `key` should come from
 * {@link calendarKey}; it is carried so downstream caches can compare content.
 */
export function buildCalendar(calendar: GanttCalendar, key: string): ResolvedCalendar {
  const intern = shapeInterner();
  const globalIntervals = normalizeIntervals(calendar.hours);

  const byWeekday: DayShape[] = [];
  for (let day = 0; day < 7; day++) {
    const override = calendar.days?.[day as Weekday];
    byWeekday.push(intern(override === undefined ? globalIntervals : normalizeIntervals(override)));
  }

  const byDate = new Map<number, DayShape>();
  if (calendar.dates) {
    for (const [dateKey, hours] of Object.entries(calendar.dates)) {
      byDate.set(dayIndexFromDateKey(dateKey), intern(normalizeIntervals(hours)));
    }
  }
  const overrideDays = [...byDate.keys()].toSorted((a, b) => a - b);

  let weekMinutes = 0;
  let isDayGranular = true;
  let isAlwaysWorking = byDate.size === 0;
  for (const shape of byWeekday) {
    weekMinutes += shape.totalMinutes;
    if (shape.totalMinutes !== 0 && shape.totalMinutes !== MINUTES_PER_DAY) {
      isDayGranular = false;
    }
    if (shape.totalMinutes !== MINUTES_PER_DAY) {
      isAlwaysWorking = false;
    }
  }
  for (const shape of byDate.values()) {
    if (shape.totalMinutes !== 0 && shape.totalMinutes !== MINUTES_PER_DAY) {
      isDayGranular = false;
    }
  }

  // ADR-018: one `durationUnit: "day"` is the week's LONGEST working day, so a
  // weekends-off calendar over full days gives exactly 24h and `duration: 3`
  // stays three whole days.
  let longestDayMinutes = 0;
  for (const shape of byWeekday) {
    if (shape.totalMinutes > longestDayMinutes) {
      longestDayMinutes = shape.totalMinutes;
    }
  }

  return {
    key,
    byWeekday,
    byDate,
    overrideDays,
    isAlwaysWorking,
    isDayGranular,
    weekMinutes,
    msPerWorkingDay: longestDayMinutes * MS_PER_MINUTE,
  };
}

/** The working shape of the civil day at `dayIndex`: a date override if one exists, else the weekday rule. */
export function shapeFor(calendar: ResolvedCalendar, dayIndex: number): DayShape {
  const override = calendar.byDate.get(dayIndex);
  if (override) {
    return override;
  }
  // `dayIndex` 0 is 1970-01-01, a Thursday (getDay() === 4).
  return calendar.byWeekday[(((dayIndex + 4) % 7) + 7) % 7]!;
}

/**
 * Smallest date-override day `>= dayIndex`, or `Infinity`. Lets a walk skip whole
 * weeks safely: between here and the next override, only the weekday rules apply.
 */
export function nextOverrideDay(calendar: ResolvedCalendar, dayIndex: number): number {
  const days = calendar.overrideDays;
  let lo = 0;
  let hi = days.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (days[mid]! < dayIndex) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo < days.length ? days[lo]! : Number.POSITIVE_INFINITY;
}

/** Largest date-override day `<= dayIndex`, or `-Infinity`. The backward-walk mirror. */
export function prevOverrideDay(calendar: ResolvedCalendar, dayIndex: number): number {
  const days = calendar.overrideDays;
  let lo = 0;
  let hi = days.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (days[mid]! <= dayIndex) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo > 0 ? days[lo - 1]! : Number.NEGATIVE_INFINITY;
}
