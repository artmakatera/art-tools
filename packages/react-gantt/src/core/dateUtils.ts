import type { CalendarUnit } from "../types";
import { memoize } from "./utils";

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = MS_PER_DAY * 7;

/** Fixed-length units convert to pixels by simple ms division. */
const LINEAR_UNIT_MS: Partial<Record<CalendarUnit, number>> = {
  minute: MS_PER_MINUTE,
  hour: MS_PER_HOUR,
  day: MS_PER_DAY,
  week: MS_PER_WEEK,
};

export function periodKey(date: Date, unit: CalendarUnit, step: number): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  switch (unit) {
    case "minute": {
      const local = new Date(date);
      local.setSeconds(0, 0);
      const minuteIndex = Math.round(local.getTime() / MS_PER_MINUTE);
      return `mi-${Math.floor(minuteIndex / step)}`;
    }
    case "hour": {
      const local = new Date(date);
      local.setMinutes(0, 0, 0);
      const hourIndex = Math.round(local.getTime() / MS_PER_HOUR);
      return `h-${Math.floor(hourIndex / step)}`;
    }
    case "day": {
      const dayIndex = Math.floor(Date.UTC(y, m, d) / MS_PER_DAY);
      return `d-${Math.floor(dayIndex / step)}`;
    }
    case "week": {
      const local = new Date(y, m, d);
      const dow = local.getDay();
      const toMonday = dow === 0 ? -6 : 1 - dow;
      local.setDate(local.getDate() + toMonday);
      const weekIndex = Math.floor(local.getTime() / (MS_PER_DAY * 7));
      return `w-${Math.floor(weekIndex / step)}`;
    }
    case "month": {
      const monthIndex = y * 12 + m;
      return `mo-${Math.floor(monthIndex / step)}`;
    }
    case "quarter": {
      const quarterIndex = y * 4 + Math.floor(m / 3);
      return `q-${Math.floor(quarterIndex / step)}`;
    }
    case "year": {
      return `y-${Math.floor(y / step)}`;
    }
    default:
      throw new Error(`Unsupported unit: ${unit}`);
  }
}

export function isWeekend(date: Date): boolean {
  const dow = date.getDay();
  return dow === 0 || dow === 6;
}

/**
 * Index of the local *civil* day containing `date` — days since 1970-01-01 by
 * calendar date, ignoring time of day and immune to DST because it is computed
 * from the civil fields rather than the epoch instant.
 *
 * The working-time calendar keys every day off this, so identical civil dates
 * in different timezones map to the same index.
 */
export function civilDayIndex(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY;
}

/** Local midnight starting the civil day at `dayIndex`. Inverse of {@link civilDayIndex}. */
export function dateFromCivilDayIndex(dayIndex: number): Date {
  const utc = new Date(dayIndex * MS_PER_DAY);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

export function diffDays(from: Date, to: Date): number {
  return civilDayIndex(to) - civilDayIndex(from);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() + days * MS_PER_DAY);
}

/**
 * Start boundary of the calendar unit containing `date` (local time): top of the
 * minute/hour, midnight for `day`, Monday for `week`, the 1st for `month`, the
 * first day of the quarter for `quarter`, Jan 1 for `year`.
 */
export function startOfUnit(date: Date, unit: CalendarUnit): Date {
  const d = new Date(date);
  switch (unit) {
    case "minute": {
      d.setSeconds(0, 0);
      return d;
    }
    case "hour": {
      d.setMinutes(0, 0, 0);
      return d;
    }
    case "day": {
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "week": {
      d.setHours(0, 0, 0, 0);
      const dow = d.getDay();
      const toMonday = dow === 0 ? -6 : 1 - dow;
      d.setDate(d.getDate() + toMonday);
      return d;
    }
    case "month": {
      d.setHours(0, 0, 0, 0);
      d.setDate(1);
      return d;
    }
    case "quarter": {
      d.setHours(0, 0, 0, 0);
      d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1);
      return d;
    }
    case "year": {
      d.setHours(0, 0, 0, 0);
      d.setMonth(0, 1);
      return d;
    }
    default: {
      throw new Error(`Unsupported unit: ${unit}`);
    }
  }
}

/**
 * Add `amount` whole calendar units to `date`. Minute/hour/day/week are fixed-ms
 * math; month/quarter/year use calendar arithmetic (`setMonth`/`setFullYear`) so
 * lengths and leap years are respected. Time-of-day is preserved for sub-day
 * units and via the calendar setters for month+.
 */
export function addUnit(date: Date, unit: CalendarUnit, amount: number): Date {
  const linearMs = LINEAR_UNIT_MS[unit];
  if (linearMs !== undefined) {
    if (unit === "day" || unit === "week") {
      return addDays(date, amount * (linearMs / MS_PER_DAY));
    }
    return new Date(date.getTime() + amount * linearMs);
  }
  const d = new Date(date);
  switch (unit) {
    case "month": {
      d.setMonth(d.getMonth() + amount);
      return d;
    }
    case "quarter": {
      d.setMonth(d.getMonth() + amount * 3);
      return d;
    }
    case "year": {
      d.setFullYear(d.getFullYear() + amount);
      return d;
    }
    default: {
      throw new Error(`Unsupported unit: ${unit}`);
    }
  }
}

/**
 * Fractional number of `unit` columns from `origin` to `date`. Fixed-length units
 * are linear ms; month/quarter/year count whole units with calendar-correct
 * boundaries and interpolate the partial unit within its own [start, next) span.
 * Inverse of {@link dateAtOffset}.
 */
export function unitOffset(origin: Date, date: Date, unit: CalendarUnit): number {
  const linearMs = LINEAR_UNIT_MS[unit];
  if (linearMs !== undefined) {
    return (date.getTime() - origin.getTime()) / linearMs;
  }
  // Bracket `date` between whole-unit boundaries addUnit(origin, unit, k) and
  // addUnit(origin, unit, k+1). Seed k from raw month arithmetic, then correct
  // (only a step or two) so the estimate survives varying month lengths.
  const monthsPerUnit = unit === "month" ? 1 : unit === "quarter" ? 3 : 12;
  const originMonths = origin.getFullYear() * 12 + origin.getMonth();
  const dateMonths = date.getFullYear() * 12 + date.getMonth();
  let k = Math.floor((dateMonths - originMonths) / monthsPerUnit);
  while (addUnit(origin, unit, k).getTime() > date.getTime()) {
    k -= 1;
  }
  while (addUnit(origin, unit, k + 1).getTime() <= date.getTime()) {
    k += 1;
  }
  const base = addUnit(origin, unit, k).getTime();
  const next = addUnit(origin, unit, k + 1).getTime();
  return k + (date.getTime() - base) / (next - base);
}

/**
 * Date at a fractional `offset` of `unit` columns from `origin`. Inverse of
 * {@link unitOffset}.
 */
export function dateAtOffset(origin: Date, unit: CalendarUnit, offset: number): Date {
  const linearMs = LINEAR_UNIT_MS[unit];
  if (linearMs !== undefined) {
    return new Date(origin.getTime() + offset * linearMs);
  }
  const whole = Math.floor(offset);
  const frac = offset - whole;
  const base = addUnit(origin, unit, whole).getTime();
  const next = addUnit(origin, unit, whole + 1).getTime();
  return new Date(base + frac * (next - base));
}

export function buildDates(
  start: Date,
  count: number,
  unit: CalendarUnit = "day",
  step = 1,
): Date[] {
  return Array.from({ length: count }, (_, i) => addUnit(start, unit, i * step));
}

interface TaskDates {
  startDate: Date;
  endDate?: Date;
}

function getMinMaxDatesNonCached(tasks: readonly TaskDates[]): { min: Date; max: Date } | null {
  const first = tasks[0];
  if (!first) {
    return null;
  }
  let min = first.startDate;
  let max = first.endDate ?? first.startDate;
  for (const t of tasks) {
    if (t.startDate < min) {
      min = t.startDate;
    }
    const end = t.endDate ?? t.startDate;
    if (end > max) {
      max = end;
    }
  }
  return { min, max };
}

export const getMinMaxDates = memoize(getMinMaxDatesNonCached, 3);
