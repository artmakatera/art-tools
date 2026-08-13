import type { DurationUnit } from "../types";
import {
  MINUTES_PER_DAY,
  MS_PER_MINUTE,
  nextOverrideDay,
  prevOverrideDay,
  shapeFor,
  type DayShape,
  type ResolvedCalendar,
} from "./calendar";
import { civilDayIndex, dateFromCivilDayIndex } from "./dateUtils";

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/** ~55 years. A walk that exceeds this is a degenerate calendar, not a real schedule. */
const MAX_WALK_DAYS = 20_000;

/** Which way a walk projects a non-working anchor before moving (ADR-007). */
export type WalkDirection = 1 | -1;

/**
 * Wall-clock minutes since local midnight, fractional to millisecond precision.
 *
 * Deliberately read from the civil fields rather than an epoch difference:
 * working time is measured in *civil* time, so a DST day is simply short or long
 * and `"9:00"` means nine o'clock on every day of the year.
 */
function minuteOfDay(date: Date): number {
  const ms =
    date.getHours() * MS_PER_HOUR +
    date.getMinutes() * MS_PER_MINUTE +
    date.getSeconds() * 1000 +
    date.getMilliseconds();
  return ms / MS_PER_MINUTE;
}

/**
 * The instant `minute` wall-clock minutes into the civil day at `dayIndex`.
 *
 * Built with the local civil constructor and an overflowing millisecond field, so
 * `instantAt(d, 1440)` is local midnight of the next civil day whether that day is
 * 23, 24, or 25 hours long. Never add 86_400_000 ms instead — that drifts across
 * every DST boundary.
 */
function instantAt(dayIndex: number, minute: number): Date {
  const base = dateFromCivilDayIndex(dayIndex);
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    0,
    0,
    0,
    Math.round(minute * MS_PER_MINUTE),
  );
}

/** Working minutes strictly before `minute` within this day. */
function workedBefore(shape: DayShape, minute: number): number {
  const { intervals, prefix } = shape;
  for (let i = 0, p = 0; i < intervals.length; i += 2, p++) {
    const from = intervals[i]!;
    const to = intervals[i + 1]!;
    if (minute <= from) {
      return prefix[p]!;
    }
    if (minute < to) {
      return prefix[p]! + (minute - from);
    }
  }
  return shape.totalMinutes;
}

/**
 * The minute at which `worked` minutes of work have elapsed, resolving an exact
 * interval boundary to that interval's **end**.
 *
 * This is the tie-break a forward walk needs: having worked through lunch, you
 * finish at 12:00, you do not start at 13:00.
 */
function minuteAtWorkedBackAnchored(shape: DayShape, worked: number): number {
  const { intervals, prefix } = shape;
  let result = intervals.length > 0 ? intervals[0]! : 0;
  for (let i = 0, p = 0; i < intervals.length; i += 2, p++) {
    if (prefix[p]! >= worked) {
      break;
    }
    result = intervals[i]! + (worked - prefix[p]!);
  }
  return result;
}

/**
 * The minute at which `worked` minutes of work have elapsed, resolving an exact
 * interval boundary to the next interval's **start**.
 *
 * The mirror tie-break, for a backward walk computing a start: a task needing the
 * afternoon begins at 13:00, not at 12:00.
 */
function minuteAtWorkedFwdAnchored(shape: DayShape, worked: number): number {
  const { intervals, prefix } = shape;
  for (let i = 0, p = 0; i < intervals.length; i += 2, p++) {
    const length = intervals[i + 1]! - intervals[i]!;
    if (worked < prefix[p]! + length) {
      return intervals[i]! + (worked - prefix[p]!);
    }
  }
  return intervals.length > 0 ? intervals[intervals.length - 1]! : 0;
}

/** First working minute at or after `minute` within this day, or `null`. */
function nextStartAtOrAfter(shape: DayShape, minute: number): number | null {
  const { intervals } = shape;
  for (let i = 0; i < intervals.length; i += 2) {
    if (minute < intervals[i + 1]!) {
      return Math.max(minute, intervals[i]!);
    }
  }
  return null;
}

/** Last valid *finish* minute at or before `minute` within this day, or `null`. */
function prevEndAtOrBefore(shape: DayShape, minute: number): number | null {
  const { intervals } = shape;
  let best: number | null = null;
  for (let i = 0; i < intervals.length; i += 2) {
    if (minute > intervals[i]!) {
      best = Math.min(minute, intervals[i + 1]!);
    }
  }
  return best;
}

/**
 * Is work happening at this instant? Half-open, matching the range syntax: with
 * hours ending at 17:00, `16:59:59.999` is working and `17:00` is not.
 */
export function isWorkingTime(calendar: ResolvedCalendar | null, date: Date): boolean {
  if (!calendar) {
    return true;
  }
  if (calendar.isAlwaysWorking) {
    return true;
  }
  const shape = shapeFor(calendar, civilDayIndex(date));
  const minute = minuteOfDay(date);
  const { intervals } = shape;
  for (let i = 0; i < intervals.length; i += 2) {
    if (minute >= intervals[i]! && minute < intervals[i + 1]!) {
      return true;
    }
  }
  return false;
}

/**
 * Project `date` onto working time in the direction a walk is about to travel.
 *
 * `dir === 1` returns the earliest working instant at or after `date` — the shape
 * a task **start** must have. `dir === -1` returns the latest valid **finish** at
 * or before it, i.e. the latest instant whose preceding moment is working.
 *
 * Idempotent in each direction, which is what keeps the dependency cascade's
 * fixpoint reachable. It is deliberately **not** symmetric: projecting a Saturday
 * forward lands on Monday morning and backward on Friday evening, so a round trip
 * does not return Saturday. See ADR-007 — that asymmetry is the design, because a
 * walk's meaning depends on whether it computes a start or a finish.
 */
export function closestWorkingTime(
  calendar: ResolvedCalendar | null,
  date: Date,
  dir: WalkDirection,
): Date {
  if (!calendar || calendar.isAlwaysWorking) {
    return date;
  }
  if (calendar.weekMinutes === 0 && calendar.byDate.size === 0) {
    // Nothing is ever working: degrade to identity rather than scanning to the cap.
    return date;
  }
  let day = civilDayIndex(date);
  let minute = minuteOfDay(date);

  for (let guard = 0; guard < MAX_WALK_DAYS; guard++) {
    const shape = shapeFor(calendar, day);
    if (dir === 1) {
      const start = nextStartAtOrAfter(shape, minute);
      if (start !== null) {
        return start === minute && day === civilDayIndex(date) ? date : instantAt(day, start);
      }
      day += 1;
      minute = 0;
      continue;
    }
    const end = prevEndAtOrBefore(shape, minute);
    if (end !== null) {
      return end === minute && day === civilDayIndex(date) ? date : instantAt(day, end);
    }
    day -= 1;
    minute = MINUTES_PER_DAY;
  }
  // Degenerate calendar (no working time anywhere in range) — degrade rather than
  // hang a render.
  return date;
}

/** Nearest working instant in either direction; ties go forward. Milestones only (ADR-009). */
export function nearestWorkingTime(calendar: ResolvedCalendar | null, date: Date): Date {
  if (!calendar || calendar.isAlwaysWorking) {
    return date;
  }
  if (isWorkingTime(calendar, date)) {
    return date;
  }
  const forward = closestWorkingTime(calendar, date, 1);
  const backward = closestWorkingTime(calendar, date, -1);
  const forwardGap = forward.getTime() - date.getTime();
  const backwardGap = date.getTime() - backward.getTime();
  return forwardGap <= backwardGap ? forward : backward;
}

function walkForward(calendar: ResolvedCalendar, anchor: Date, minutes: number): Date {
  let day = civilDayIndex(anchor);
  let minute = minuteOfDay(anchor);
  let remaining = minutes;

  for (let guard = 0; guard < MAX_WALK_DAYS; guard++) {
    const shape = shapeFor(calendar, day);
    const worked = workedBefore(shape, minute);
    const available = shape.totalMinutes - worked;
    if (remaining <= available) {
      return instantAt(day, minuteAtWorkedBackAnchored(shape, worked + remaining));
    }
    remaining -= available;
    day += 1;
    minute = 0;

    // Whole-week skip: between here and the next date override only the weekday
    // rules apply, so a multi-year lag costs a binary search, not a day loop. Always
    // leave at least one week to walk so the landing minute is resolved day by day.
    if (calendar.weekMinutes > 0 && remaining > calendar.weekMinutes) {
      const nextOverride = nextOverrideDay(calendar, day);
      const safeWeeks =
        nextOverride === Number.POSITIVE_INFINITY
          ? Number.POSITIVE_INFINITY
          : Math.floor((nextOverride - day) / 7);
      const workWeeks = Math.ceil(remaining / calendar.weekMinutes) - 1;
      const weeks = Math.min(safeWeeks, workWeeks);
      if (weeks > 0 && Number.isFinite(weeks)) {
        day += weeks * 7;
        remaining -= weeks * calendar.weekMinutes;
      }
    }
  }
  return instantAt(day, minute);
}

function walkBackward(calendar: ResolvedCalendar, anchor: Date, minutes: number): Date {
  let day = civilDayIndex(anchor);
  let minute = minuteOfDay(anchor);
  let remaining = minutes;

  for (let guard = 0; guard < MAX_WALK_DAYS; guard++) {
    const shape = shapeFor(calendar, day);
    const worked = workedBefore(shape, minute);
    if (remaining <= worked) {
      return instantAt(day, minuteAtWorkedFwdAnchored(shape, worked - remaining));
    }
    remaining -= worked;
    day -= 1;
    minute = MINUTES_PER_DAY;

    if (calendar.weekMinutes > 0 && remaining > calendar.weekMinutes) {
      const previousOverride = prevOverrideDay(calendar, day);
      const safeWeeks =
        previousOverride === Number.NEGATIVE_INFINITY
          ? Number.POSITIVE_INFINITY
          : Math.floor((day - previousOverride) / 7);
      const workWeeks = Math.ceil(remaining / calendar.weekMinutes) - 1;
      const weeks = Math.min(safeWeeks, workWeeks);
      if (weeks > 0 && Number.isFinite(weeks)) {
        day -= weeks * 7;
        remaining -= weeks * calendar.weekMinutes;
      }
    }
  }
  return instantAt(day, minute);
}

/**
 * Advance `from` by `ms` of **working** time; a negative `ms` walks backward.
 *
 * `anchorDir` controls only the initial projection of `from` onto working time and
 * defaults to the direction of the walk. A caller computing a *finish* with
 * `ms === 0` must pass `-1` explicitly — that is exactly the `lag: 0` case in the
 * FF and SF branches of the cascade, where deriving the direction from the sign of
 * a zero would silently project the wrong way.
 *
 * Composition: `addWorkingMs(addWorkingMs(t, a), -a) === t` **iff** `t` is anchored
 * in the direction of `sign(a)` — see ADR-007. Project once at the boundary of an
 * operation, then compose freely inside it.
 */
export function addWorkingMs(
  calendar: ResolvedCalendar | null,
  from: Date,
  ms: number,
  anchorDir?: WalkDirection,
): Date {
  if (!calendar) {
    return new Date(from.getTime() + ms);
  }
  const dir: WalkDirection = anchorDir ?? (ms < 0 ? -1 : 1);
  const anchor = closestWorkingTime(calendar, from, dir);
  if (ms === 0) {
    return anchor;
  }
  if (calendar.weekMinutes === 0 && calendar.byDate.size === 0) {
    return anchor;
  }
  return ms > 0
    ? walkForward(calendar, anchor, ms / MS_PER_MINUTE)
    : walkBackward(calendar, anchor, -ms / MS_PER_MINUTE);
}

/**
 * Working time in `[from, to)`, in milliseconds. Negative when `to < from`.
 *
 * Unlike {@link addWorkingMs} this is a plain integral, so it is unconditionally
 * additive: `count(a, b) + count(b, c) === count(a, c)` for any instants. That is
 * why span measurement always goes through it.
 */
export function countWorkingMs(
  calendar: ResolvedCalendar | null,
  from: Date,
  to: Date,
): number {
  if (!calendar) {
    return to.getTime() - from.getTime();
  }
  if (to.getTime() < from.getTime()) {
    return -countWorkingMs(calendar, to, from);
  }
  const endDay = civilDayIndex(to);
  let day = civilDayIndex(from);
  let minute = minuteOfDay(from);
  let minutes = 0;

  while (day < endDay) {
    if (minute === 0 && calendar.weekMinutes > 0) {
      const nextOverride = nextOverrideDay(calendar, day);
      const limit = Math.min(endDay, nextOverride);
      const weeks = Math.floor((limit - day) / 7);
      if (weeks > 0) {
        minutes += weeks * calendar.weekMinutes;
        day += weeks * 7;
        continue;
      }
    }
    const shape = shapeFor(calendar, day);
    minutes += shape.totalMinutes - workedBefore(shape, minute);
    day += 1;
    minute = 0;
  }

  const shape = shapeFor(calendar, day);
  minutes += workedBefore(shape, minuteOfDay(to)) - workedBefore(shape, minute);
  return minutes * MS_PER_MINUTE;
}

/** True when `[from, to)` contains no working time at all — the shading predicate. */
export function isNonWorkingSpan(
  calendar: ResolvedCalendar | null,
  from: Date,
  to: Date,
): boolean {
  if (!calendar) {
    return false;
  }
  return countWorkingMs(calendar, from, to) === 0;
}

/** Why a column is shaded. Weekend vs holiday matters only for styling. */
export type NonWorkingReason = "weekend" | "holiday" | "offHours";

export interface NonWorkingInfo {
  isNonWorking: boolean;
  reason?: NonWorkingReason;
}

const WORKING: NonWorkingInfo = { isNonWorking: false };

/**
 * Whether a timeline column covering `[colStart, colEnd)` is non-working, and why.
 *
 * With no calendar this falls back to the hardcoded Sat/Sun rule so the default
 * look is unchanged. A **partial** day (a short Friday) counts as working and is
 * not shaded at day scale — partial shading at 40px per column would be noise —
 * but at hour scale the off-hours columns inside it shade individually.
 */
export function nonWorkingInfo(
  calendar: ResolvedCalendar | null,
  colStart: Date,
  colEnd: Date,
): NonWorkingInfo {
  if (!calendar) {
    const day = colStart.getDay();
    if (day === 0 || day === 6) {
      return { isNonWorking: true, reason: "weekend" };
    }
    return WORKING;
  }
  if (countWorkingMs(calendar, colStart, colEnd) > 0) {
    return WORKING;
  }
  const dayIndex = civilDayIndex(colStart);
  if (calendar.byDate.has(dayIndex)) {
    return { isNonWorking: true, reason: "holiday" };
  }
  // A whole day with no working time at all is a weekend rule; a shorter slice
  // inside an otherwise-working day is just off-hours.
  const shape = shapeFor(calendar, dayIndex);
  if (shape.totalMinutes === 0) {
    return { isNonWorking: true, reason: "weekend" };
  }
  return { isNonWorking: true, reason: "offHours" };
}

/**
 * Working milliseconds one `unit` represents. A `"day"` is the week's longest
 * working day (ADR-018), so a weekends-off calendar over full days keeps
 * `duration: 3` meaning three whole days.
 */
export function workingMsPerUnit(
  calendar: ResolvedCalendar | null,
  unit: DurationUnit,
): number {
  if (unit === "minute") {
    return MS_PER_MINUTE;
  }
  if (unit === "hour") {
    return MS_PER_HOUR;
  }
  if (!calendar || calendar.msPerWorkingDay === 0) {
    return MS_PER_DAY;
  }
  return calendar.msPerWorkingDay;
}

/** {@link addWorkingMs} in whole `durationUnit`s. */
export function addWorkingUnits(
  calendar: ResolvedCalendar | null,
  from: Date,
  amount: number,
  unit: DurationUnit,
  anchorDir?: WalkDirection,
): Date {
  return addWorkingMs(calendar, from, amount * workingMsPerUnit(calendar, unit), anchorDir);
}
